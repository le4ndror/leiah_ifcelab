FROM node:24-bookworm-slim
WORKDIR /app

ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server/ ./server/
COPY public/ ./public/

USER node
EXPOSE 4000
CMD ["node", "server/index.js"]
