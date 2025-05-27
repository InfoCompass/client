
const CONFIG			=	{config: "#REPLACE_CONFIG"} 	// replaced by build script
const STATIC_FILES		=	["#REPLACE_STATIC_PRE_CACHE"]	// replaced by build script
const CACHE_VERSION		= 	1
const BUILD				=	"#REPLACE_BUILD"  				// replaced by build script


class StaticPreCacheControl {

	name

	constructor(version){
		this.name = `static-pre-cache-v${version}`
	}

	async setup(){
		const cache	=	await caches.open(this.name)
    	await cache.addAll(STATIC_FILES)	
	}

	async fetch(request){
		const cache 	= await caches.open(this.name)
		const response	= await cache.match(request)

		if(response) return response
	}

}


const CURRENT_CACHES	= 	[
								new StaticPreCacheControl(CACHE_VERSION)
							]

async function cleanCaches(){

	const currentCacheNames 	= 	CURRENT_CACHES.map( cc => cc.name)

	const outdatedCacheNames	= 	(await caches.keys())
									.filter( cacheName => !currentCacheNames.includes(cacheName))

	const cachesCleaned			= 	Promise.all(
										outdatedCacheNames
										.map( cacheName => caches.delete(cacheName) )
									)
	await cachesCleaned
	
}

function updateItems(){
	console.log('UPDATEITEMS!!!')
}


function blockSocketIo(request){
	if(request.url.match(/socket\.io/)){
		return new Response("Blocked by ic-service-worker.js.", {status: 410, statusText: "Blocked by service worker"} )
	}
}


self.addEventListener("install", installEvent => {
	self.skipWaiting()
	
	installEvent.waitUntil(Promise.all(CURRENT_CACHES.map( cc => cc.setup() )))
})

self.addEventListener("activate", activateEvent => {

	activateEvent.waitUntil((async () => {

      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable()
      }

      await Promise.all([
		cleanCaches,
		clients.claim()
	])

    })())

})

self.addEventListener("fetch", fetchEvent => {

	fetchEvent.respondWith( (async () => {

		const request 			= 	fetchEvent.request
		
		try {

			const cachedResponses 	=	await Promise.all([
											//blockSocketIo(request),
											...CURRENT_CACHES.map( cc => cc.fetch(request))
										])

			const cachedResponse	=	cachedResponses
										.find( r => r instanceof Response)
			
			if(cachedResponse) return cachedResponse

			const preloadResponse 	=	await fetchEvent.preloadResponse

	      	if (preloadResponse) return preloadResponse	

	     } catch(e){
	     	console.error(e)
	     }

		return await fetch(request)

	})())

})


self.addEventListener("message", messageEvent => {
	
	if(messageEvent.data === "update-items") updateItems()
})