# WillyanLab — Laboratório de Eletrônica

O servidor Node.js entrega o site e a API no mesmo endereço. As URLs das páginas e das rotas existentes da API foram mantidas.

| Pasta | Conteúdo |
| --- | --- |
| `public/` | Páginas, manifesto e service worker |
| `public/assets/` | CSS, JavaScript do navegador e imagens |
| `server/` | Backend Express e integração Firebase/Groq |
| `docs/`, `tools/`, `archive/` | Referências, ferramentas e código legado; não são publicados |

## Subir com Docker Compose

Na raiz do projeto, em um servidor com Docker e Compose, crie o `.env` se ele ainda não existir:

```sh
cp -n .env.example .env
chmod 600 .env
```

1. Preencha `FIREBASE_DATABASE_URL` com a URL do Realtime Database. O front-end já aponta para o projeto Firebase original; se migrar de projeto, ajuste também o `firebaseConfig` em `public/assets/js/script.js`.
2. Coloque o JSON da conta de serviço em `secrets/firebase-service-account.json` ou indique outro arquivo em `FIREBASE_SERVICE_ACCOUNT_PATH`. Use um arquivo fora de `public/`. No Docker padrão em Linux, o processo roda como UID `1000`: esse UID precisa ter leitura. Por exemplo, em uma cópia da credencial exclusiva para este deploy, use `sudo chown 1000 secrets/firebase-service-account.json` e `sudo chmod 600 secrets/firebase-service-account.json`. O Compose monta o arquivo somente para leitura.
3. Se já existem chaves Groq cadastradas, reutilize o mesmo `KEY_ENCRYPTION_SECRET`: trocar esse valor impede a leitura das chaves antigas. Para uma instalação nova, gere um segredo com `openssl rand -hex 32` e salve-o no `.env`.

```sh
docker compose config -q
docker compose up -d --build
docker compose ps
curl --fail http://localhost:4000/api/health
docker compose logs --tail=100 site
```

O healthcheck confirma que o processo responde, mas não verifica Firebase nem Groq. O Compose usa `HOST_PORT` para mudar a porta no servidor; a porta interna é sempre `4000`.

## Acessar pelo domínio

Por padrão, a porta só é publicada em `127.0.0.1` no servidor. Para acesso remoto, configure um proxy reverso **no host** para enviar todo o tráfego do domínio, inclusive `/api/`, para `127.0.0.1:4000` (ou a porta escolhida). Use **HTTPS**: o login usa a API Web Crypto do navegador, e o service worker também exige um contexto seguro fora de `localhost`. Se o proxy limitar o tamanho das requisições, permita ao menos `10 MiB` para os envios de imagens.

**Não exponha o site à internet sem controle de acesso.** O login atual não é validado pelo backend e as rotas Groq não autenticam o grupo. Para uso restrito, mantenha o acesso atrás de uma VPN ou de um proxy com autenticação. Para publicação aberta, implemente autorização no servidor e revise as regras do Firebase antes de disponibilizar dados de alunos. Se a credencial do Hugging Face que constava no código legado era válida, revogue-a no provedor: ela ainda pode estar no histórico do Git.

## Rodar sem Docker

Com Node.js 24, rode `npm ci` e `npm start`. O site abre em `http://localhost:4000` por padrão. Para desenvolvimento, use `npm run dev`. O `.env` fornece as mesmas credenciais ao backend, e `PORT` controla a porta fora do Docker.
