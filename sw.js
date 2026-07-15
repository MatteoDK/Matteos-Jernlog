/* Master Matteos Jernlog — service worker
   Eneste formål: sørge for at appen ALTID henter den nyeste index.html fra
   serveren, fremfor at telefonen viser en gammel, cachet version. Appen
   kræver alligevel internet (cloud-backend), så der er ikke noget behov for
   "rigtig" offline-caching her — kun at undgå forældet indhold. */

self.addEventListener("install", function(e){
  self.skipWaiting();
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(names.map(function(n){ return caches.delete(n); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  /* Gå altid efter netværket først (og bed browseren om ikke selv at cache).
     Falder kun tilbage til evt. cache hvis der reelt ikke er internet. */
  e.respondWith(
    fetch(e.request, { cache: "no-store" }).catch(function(){
      return caches.match(e.request);
    })
  );
});
