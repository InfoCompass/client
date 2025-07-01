
const CONFIG				=	{config: "#REPLACE_CONFIG"} 	// replaced by build script
const STATIC_FILES			=	["#REPLACE_STATIC_PRE_CACHE"]	// replaced by build script
const CACHE_VERSION			= 	1
const BUILD					=	"#REPLACE_BUILD"  				// replaced by build script
const USER_CHECK_URL		=	CONFIG.backendLocation +"/users/me"


let MappoServiceWorkerCache
if(CONFIG.mappo){
	console.log("Found Mappo config, importing mappo caching script...")
	importScripts("./mappo-service-worker-cache.js")
	MappoServiceWorkerCache = Mappo.MappoServiceWorkerCache
	console.log({MappoServiceWorkerCache})
}


// needs testing:
// async function getUserLoginState(){
// 	const result = await fetch(USER_CHECK_URL)
// 	console.log('User loggin in?', result.status === 200)
// 	return 	result.status === 200			
// }

class PreventCache {

	name  = "prevent-cache"

	async setup(){}

	match(request){

		const origins		=	[
									CONFIG.statsLocation,
									CONFIG.backendLocation,
									...(
										CONFIG.map && CONFIG.map.tiles
										?	[new URL(CONFIG.map.tiles).origin]
										:	[]
									)
								]


		const select		= 	[
									/ic-service-worker\.js/,
									/manifest\.json/,
									/socket\.io/,

								]

		const originMatch	=	origins.some( origin => request.url.startsWith(origin) )
		const genericMatch	=	select.some( regex => request.url.match(regex) )

		return originMatch || genericMatch
	}

	async fetch({request, preloadResponse}){

		if(!this.match(request)) throw Error(`Request does not .match(), ${this.name}.`)

		console.log(`Using ${this.name}, getting fresh response for:`, request.url)	
		return await preloadResponse || await fetch(request.clone())
	}
}

class StaticPreCacheControl {

	name

	constructor(version){
		this.name = `static-pre-cache-v${version}`
	}

	match(request){
		return STATIC_FILES.some( url => request.url.includes(url))
	}

	async setup(){

		const cache			=	await caches.open(this.name)
		const currentKeys 	=	await cache.keys()
		const currentUrls	=	currentKeys.map( request => request.url)
		const outdatedUrls	=	currentUrls.filter( url => !STATIC_FILES.includes(url))

		outdatedUrls.forEach( url => void cache.delete(url) )

		await cache.addAll(STATIC_FILES)

	}

	async fetch({ request }){

		if(!this.match(request)) throw Error(`Request does not .match(), ${this.name}.`)		

		const cache 	= await caches.open(this.name)
		const response	= await cache.match(request.clone())

		if(!response) throw new Error("StaticPreCacheControl: no cached version available.")

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
		const cache			=	await caches.open(this.name)

		await cache.add("/")

		const indexResponse	=	await cache.match("/")	

		this.indexUrl	

	}

	match(request){
		if(!request.url.startsWith(location.origin)) return false
		
		const path			=	new URL(request.url).pathname
		const ignore		=	[
									/^\/assets/,
									/^\/fonts/,
									/^\/images/,
									/^\/js/,
									/^\/styles/,
									/^\/worker/,
									/\.js$/,
									/\.json$/,
									/build$/
								]

		if(ignore.some( regex => path.match(regex))) return	false				

		return true	

	}

	async fetch({request}) {

		if(!this.match(request)) throw Error(`Request does not .match(), ${this.name}.`)

		// Must try fresh response first, otherwise user might get stuck with old version (old index.html loads old scripts!)
		const freshResponse	=	await fetch(request)	

		if(freshResponse.ok) return freshResponse

		const cache			=	await caches.open(this.name)
		const indexResponse	=	await cache.match("/")

		if(!indexResponse) throw new Error("IndexCache: no cached version available.")

		console.log(`Using ${this.name} for:`, request.url)

		return indexResponse
	}
}

// class FallbackCache {
// 	name 

// 	constructor(version){
// 		this.name = `fallback-v${version}`
// 	}

// 	async setup(){}

// 	match(){

// 	}

// 	async fetch({request, preloadResponse}){

// 		const freshResponse 	= 	await preloadResponse || await fetch(request.clone())
// 		const cache				= 	await caches.open(this.name)

// 		if(freshResponse.status < 200){
// 			console.log(`Using ${this.name}, got successful fresh response for: `, request.url)
// 			cache.put(request, freshResponse.clone())
// 			return freshResponse
// 		}
		
// 		const userLoggedIn		=	await getUserLoginState()

// 		if(userLoggedIn){
// 			console.log(`Using ${this.name}, user logged in , sending failed fresh response for: `, request.url)				
// 			return freshResponse
// 		}

// 		const cachedResponse	= 	await cache.match(request)

// 		if(cachedResponse){
// 			console.log(`Using ${this.name}, got cached response for: `, request.url)
// 			return cachedResponse	
// 		}

// 		console.log(`Using ${this.name}, no cache, only failed fresh response for: `, request.url)			
// 		return freshResponse
// 	}
// }


const CURRENT_CACHES	= 	[						
								// new PreventCache(CACHE_VERSION), // must be first!
								new StaticPreCacheControl(CACHE_VERSION),
								...	(CONFIG.mappo
									?	[new MappoServiceWorkerCache(CONFIG.mappo, CACHE_VERSION)]
									: 	[]),
								new IndexCache(CACHE_VERSION),
								//new FallbackCache(CACHE_VERSION) // must be last!
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
	console.log('TODO: UPDATEITEMS!!!')
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


self.addEventListener("fetch", fetchEvent => {

	const request 			=	fetchEvent.request		

	for( const cacheControl of CURRENT_CACHES ){
		if(cacheControl.match && cacheControl.match(request)){
			const fetchPromise 	= 	cacheControl.fetch(fetchEvent)
									.catch( () => fetch(fetchEvent.request))

			fetchEvent.respondWith(fetchPromise)			
		} 
	}
})


self.addEventListener("message", messageEvent => {	
	if(messageEvent.data === "update-items") updateItems()
})

