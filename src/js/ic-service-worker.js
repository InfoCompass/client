const CONFIG				=	{config: "#REPLACE_CONFIG"} 	// replaced by build script
const STATIC_FILES			=	["#REPLACE_STATIC_PRE_CACHE"]	// replaced by build script
const CACHE_VERSION			= 	1
const BUILD					=	"#REPLACE_BUILD"  				// replaced by build script
const USER_CHECK_URL		=	CONFIG.backendLocation +"/users/me"


async function getUserLoginState(){
	const result = await fetch(USER_CHECK_URL)
	return 	result.status === 200			
}

class PreventCache {

	name  = "prevent-cache"

	async setup(){}

	async fetch({request, preloadResponse}){

		const origins		=	[
									CONFIG.statsLocation,
									CONFIG.map.tiles.split('?')[0]
								]

		const select		= 	[
									/ic-service-worker\.js/,
									/manifest\.json/,
									/socket\.io/
								]

		const originMatch	=	origins.some( origin => request.url.startsWith(origin) )
		const genericMatch	=	select.some( regex => request.url.match(regex) )

		if(!originMatch && !genericMatch) return

		console.log(`Using ${this.name}, getting fresh response for:`, request.url)	
		return await preloadResponse || await fetch(request)
	}
}

class StaticPreCacheControl {

	name

	constructor(version){
		this.name = `static-pre-cache-v${version}`
	}

	async setup(){
		const cache			=	await caches.open(this.name)
		const currentKeys 	=	await cache.keys()
		const currentUrls	=	currentKeys.map( request => request.url)
		const outdatedUrls	=	currentUrls.filter( url => !STATIC_FILES.includes(url))

		outdatedUrls.forEach( url => void cache.delete(url) )

		await cache.addAll(STATIC_FILES).catch( e => console.log('ERROR', e))

	}

	async fetch({request}){
		const cache 	= await caches.open(this.name)
		const response	= await cache.match(request)

		if(!response) return 

		console.log(`Using ${this.name} for:`, request.url)
		return response
	}

}


class IndexCache {

	name
	constructor(CACHE_VERSION){
		this.name = `index-v${CACHE_VERSION}`
	}

	async setup(){
		const cache	=	await caches.open(this.name)
		cache.add("/")
	}

	async fetch({request}) {
		const cache			=	await caches.open(this.name)
		const indexResponse	=	await cache.match("/")

		if(!request.url.startsWith(indexResponse.url)) return

		const path		=	'/'+(request.url.split(indexResponse.url)[1])

		const ignore	=	[
								/^\/fonts/,
								/^\/assets/,
							]

		if(ignore.some( regex => path.match(regex))) return					

		console.log(`Using ${this.name} for:`, request.url)

		return indexResponse
	}
}

class FallbackCache {
	name 

	constructor(version){
		this.name = `fallback-v${version}`
	}

	async setup(){}

	async fetch({request, preloadResponse}){

		const freshResponse 	= 	await preloadResponse || await fetch(request.clone())
		const cache				= 	await caches.open(this.name)

		if(freshResponse.ok){
			console.log(`Using ${this.name}, got successful fresh response for: `, request.url)
			cache.put(request, freshResponse.clone())
			return freshResponse
		}
		
		const userLoggedIn		=	await getUserLoginState()

		if(userLoggedIn){
			console.log(`Using ${this.name}, user logged in , sending failed fresh response for: `, request.url)				
			return freshResponse
		}

		const cachedResponse	= 	await cache.match(request)

		if(cachedResponse){
			console.log(`Using ${this.name}, got cached response for: `, request.url)
			return cachedResponse	
		}

		console.log(`Using ${this.name}, no cache, only failed fresh response for: `, request.url)			
		return freshResponse
	}
}


const CURRENT_CACHES	= 	[
								new PreventCache(CACHE_VERSION), // must be first!
								new StaticPreCacheControl(CACHE_VERSION),
								new IndexCache(CACHE_VERSION),
								new FallbackCache(CACHE_VERSION) // must be last!
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

self.addEventListener("install", installEvent => {
	installEvent.waitUntil( (async () => {
		await Promise.all(CURRENT_CACHES.map( cc => cc.setup() ))
		self.skipWaiting()
	})())
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

async function getCacheReponse(){
	

}

self.addEventListener("fetch", fetchEvent => {

	fetchEvent.respondWith( (async ()=> {
	
		const request 			=	fetchEvent.request
		const preloadResponse 	=	await fetchEvent.preloadResponse

		let cachedResponse	

		for( cacheControl of CURRENT_CACHES ){
			try {
				cachedResponse = await cacheControl.fetch(fetchEvent)
			} catch(e){
				console.error(e)
			}

			if(cachedResponse) break
		}
		
		if(cachedResponse) return cachedResponse

		console.log("No cache control for: ", request.url)

		if(preloadResponse) return await preloadResponse

		return await fetch(request)
	})())
})


self.addEventListener("message", messageEvent => {
	
	if(messageEvent.data === "update-items") updateItems()
})