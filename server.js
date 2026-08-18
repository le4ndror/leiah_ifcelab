import 'dotenv/config'; // Lê o arquivo .env automaticamente
import express from 'express';
import cors from 'cors';

const app = express();

// Adiciona CORS para permitir comunicação entre front-end e back-end
app.use(cors());

// Permite receber dados em JSON e imagens grandes
app.use(express.json({ limit: '10mb' }));

// Rota API primeiro (antes do static)
app.post('/api/analisar', async (req, res) => {
  try {
    const { imagemBase64 } = req.body;

    if (!imagemBase64) {
      return res.status(400).json({ error: "Imagem não fornecida" });
    }

    // Verifica se a API key está configurada
    if (!process.env.GROQ_API_KEY) {
      console.error("GROQ_API_KEY não está configurada no arquivo .env");
      return res.status(500).json({ error: "API key não configurada no servidor" });
    }

    console.log("Iniciando análise de imagem com Groq AI (modelo Llama-3.2-Vision)...");
    
    // Usando API do Groq com modelo Llama-3.2-Vision (suporta imagens)
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.2-11b-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analise a foto deste caderno de física. Verifique as fórmulas e o resultado. Diga se está correto e dê um feedback explicativo em português. Se os cálculos estiverem corretos, diga que está correto. Se houver erros, aponte-os e explique como corrigir."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imagemBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const feedback = data.choices[0].message.content;
    console.log("Análise concluída com sucesso!");
    
    res.json({ 
      feedback: feedback,
      model: "llama-3.2-11b-vision-preview (Groq AI)"
    });
    
  } catch (error) {
    console.error("Erro ao processar imagem:", error);
    res.status(500).json({ error: "Erro ao processar imagem: " + error.message });
  }
});

// Serve os arquivos estáticos depois das rotas API
app.use(express.static('.')); // Serve os arquivos HTML/JS da pasta atual

app.listen(4000, () => {
  console.log('Servidor rodando em http://localhost:4000');
  console.log('API Key configurada:', !!process.env.GROQ_API_KEY);
  console.log('Usando Groq AI com modelo Llama-3.2-Vision para análise de imagens');
  console.log('CORS habilitado para comunicação front-end/back-end');
});