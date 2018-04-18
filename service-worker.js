var cacheName = 'alc-news-11';

var appShellFiles = [
  '/',
  '/index.html',
  '/app.js',
  '/idb.js',
  '/styles.css',
  '/manifest.json',
  '/materialize/css/materialize.css',
  'https://fonts.googleapis.com/icon?family=Material+Icons'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(cacheName).then((cache) => {
      return cache.addAll(appShellFiles);
    })
  );
});


self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== cacheName) {
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});


self.addEventListener('fetch', function(e) {
  if (e.request.url.endsWith('.jpg') || e.request.url.endsWith('.png')) {
    e.respondWith(
      caches.match(e.request).then(response => {
        if (response) {
          return response
        };
        fetch(e.request.clone()).then(response => {
          if(!response) {
            return response;
          }
          caches.open(cacheName).then(cache => {
            cache.put(e.request, response.clone());
            return response;
          });
        });
      })
    );
  }
  else {
    e.respondWith(
    caches.match(e.request).then(function(response) {
      if (response) return response;
      return fetch(e.request);
    })
  );
  }
});