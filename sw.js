// Mudamos o nome para v2 para forçar o celular a baixar a versão nova
const CACHE_NAME = 'lab-eletronica-v4'; 

// Lista de arquivos que o aplicativo precisa salvar no celular
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icone-192.png',
  './icone-512.png'
];

// Instalação: Baixa os arquivos e guarda no cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Interceptador: Tenta pegar do cache primeiro; se não achar, pega da internet
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});

// Ativação: Limpa os caches antigos (a versão v1 quebrada) do celular do usuário
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName); // Deleta o cache velho
          }
        })
      );
    })
  );
});
