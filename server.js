import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import { readFile } from 'node:fs/promises';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

const app = express();
const port = Number(process.env.PORT) || 4000;
const encryptionSecret = process.env.KEY_ENCRYPTION_SECRET;
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const firebaseDatabaseUrl = process.env.FIREBASE_DATABASE_URL;
const model = 'qwen/qwen3.8-27b';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

let database;
if (serviceAccountPath && firebaseDatabaseUrl) {
  const serviceAccount = JSON.parse(await readFile(serviceAccountPath, 'utf8'));
  const firebaseApp = getApps()[0] || initializeApp({
    credential: cert(serviceAccount),
    databaseURL: firebaseDatabaseUrl
  });
  database = getDatabase(firebaseApp);
}

function requireDatabase(res) {
  if (!database) {
    res.status(503).json({ error: 'Configure FIREBASE_SERVICE_ACCOUNT_PATH e FIREBASE_DATABASE_URL no servidor.' });
    return false;
  }
  return true;
}

function encryptApiKey(apiKey) {
  const iv = crypto.randomBytes(12);
  const key = crypto.createHash('sha256').update(encryptionSecret).digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()]);
  return { iv: iv.toString('base64'), data: encrypted.toString('base64'), tag: cipher.getAuthTag().toString('base64') };
}

function decryptApiKey(encrypted) {
  const key = crypto.createHash('sha256').update(encryptionSecret).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(encrypted.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(encrypted.tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(encrypted.data, 'base64')), decipher.final()]).toString('utf8');
}

async function readGroupKey(group) {
  const snapshot = await database.ref(`configuracoesGroq/${group}`).get();
  const encrypted = snapshot.val();
  return encrypted ? decryptApiKey(encrypted) : null;
}

app.post('/api/chave-groq', async (req, res) => {
  try {
    const { grupo, apiKey } = req.body;
    if (typeof grupo !== 'string' || !/^[\w -]{1,60}$/.test(grupo.trim())) return res.status(400).json({ error: 'Grupo inválido.' });
    if (typeof apiKey !== 'string' || !apiKey.trim()) return res.status(400).json({ error: 'Informe uma chave Groq válida.' });
    if (!encryptionSecret) return res.status(503).json({ error: 'Configure KEY_ENCRYPTION_SECRET no servidor.' });
    if (!requireDatabase(res)) return;

    const validation = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey.trim()}` }
    });
    if (!validation.ok) return res.status(422).json({ error: 'A Groq não aceitou essa chave. Confira se ela está correta.' });

    await database.ref(`configuracoesGroq/${grupo.trim()}`).set(encryptApiKey(apiKey.trim()));
    res.json({ saved: true });
  } catch (error) {
    console.error('Falha ao salvar a chave Groq:', error.message);
    res.status(500).json({ error: 'Não foi possível salvar a chave do grupo.' });
  }
});

app.get('/api/chave-groq/status', async (req, res) => {
  try {
    const grupo = req.query.grupo;
    if (typeof grupo !== 'string' || !grupo.trim()) return res.status(400).json({ error: 'Grupo inválido.' });
    if (!requireDatabase(res)) return;
    res.json({ configured: Boolean(await readGroupKey(grupo.trim())) });
  } catch (error) {
    console.error('Falha ao consultar chave Groq:', error.message);
    res.status(500).json({ error: 'Não foi possível consultar a configuração do grupo.' });
  }
});

app.post('/api/analisar', async (req, res) => {
  try {
    const { imagemBase64, grupo } = req.body;
    if (typeof imagemBase64 !== 'string' || !imagemBase64) return res.status(400).json({ error: 'Imagem não fornecida.' });
    if (typeof grupo !== 'string' || !grupo.trim()) return res.status(400).json({ error: 'Entre no sistema com seu grupo antes da análise.' });
    if (!encryptionSecret) return res.status(503).json({ error: 'Configure KEY_ENCRYPTION_SECRET no servidor.' });
    if (!requireDatabase(res)) return;

    const apiKey = await readGroupKey(grupo.trim());
    if (!apiKey) return res.status(409).json({ error: 'Este grupo ainda não cadastrou a chave Groq na tela do aluno.' });

    const image = Buffer.from(imagemBase64, 'base64');
    if (image.length > 7 * 1024 * 1024) return res.status(413).json({ error: 'A imagem deve ter no máximo 7 MB.' });
    const mimeMatch = req.body.mimeType && /^image\/(jpeg|png|webp|gif)$/.exec(req.body.mimeType);
    const mimeType = mimeMatch ? mimeMatch[0] : 'image/jpeg';

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Analise esta imagem de cálculos de eletrônica. Confira fórmulas, unidades, sinais e resultados. Explique em português o que está correto e, se houver erros, mostre como corrigir. Se a imagem estiver ilegível, solicite uma foto mais nítida.' },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imagemBase64}` } }
          ]
        }],
        max_tokens: 700
      })
    });
    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('Resposta não JSON da Groq:', response.status, responseText.slice(0, 300));
      return res.status(502).json({ error: `A Groq retornou HTTP ${response.status} sem JSON. Confira se a chave tem acesso ao modelo ${model}.` });
    }
    if (!response.ok) {
      console.error('Erro Groq:', response.status, data.error?.message || 'Resposta inválida');
      return res.status(502).json({ error: data.error?.message || `A Groq retornou HTTP ${response.status}.` });
    }
    const feedback = data.choices?.[0]?.message?.content;
    if (!feedback) return res.status(502).json({ error: 'A Groq retornou uma resposta vazia.' });
    res.json({ feedback, model });
  } catch (error) {
    console.error('Erro ao processar imagem:', error.message);
    res.status(500).json({ error: 'Erro ao processar imagem. Verifique a conexão e a configuração do servidor.' });
  }
});

app.use(express.static('.'));

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
  if (!encryptionSecret) console.warn('Defina KEY_ENCRYPTION_SECRET para habilitar as chaves Groq por grupo.');
  if (!database) console.warn('Defina FIREBASE_SERVICE_ACCOUNT_PATH e FIREBASE_DATABASE_URL para conectar ao Firebase.');
});
