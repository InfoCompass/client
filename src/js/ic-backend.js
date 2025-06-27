class IcBackend {

	config 

	constructor(config){
		this.config = config
	}

	async login(username, password){
		const body 			= 	JSON.stringify({username, password})
		const method 		= 	"POST"
		const credentials	= 	'include'

		const headers		=	{
									'Accept': 		'application/json',
									'Content-Type':	'application/json',
								}

		const response 		= await fetch(icConfig.backendLocation+'/users/login', { method, body, credentials, headers })

		return	response.ok
				?	Promise.resolve()
				:	Promise.reject(response)
	}

	async getItems(){
		const backendLocation 	= 	this.config.backendLocation
		const collectionName 	= 	ic.itemConfig.collectionName
		const credentials		= 	'include'				

		const response 			= 	await fetch(`${backendLocation}/${collectionName}`, { credentials })
		const items				= 	await response.json()

		return items
	}

	async getItem(id){
		const backendLocation 	= 	this.config.backendLocation
		const collectionName 	= 	ic.itemConfig.collectionName
		const credentials		= 	'include'				
		const response 			= 	await fetch(`${backendLocation}/${collectionName}/${id}`, { credentials })
		const item				= 	await response.json()

		return item
	}

	async updateItem(id, itemData){
		const backendLocation 	= 	this.config.backendLocation
		const collectionName 	= 	ic.itemConfig.collectionName
		const method			= 	"PUT"
		const headers			=	{
										'Accept': 		'application/json',
										'Content-Type':	'application/json',
									}
		const credentials		= 	'include'		
		const body				= 	JSON.stringify(itemData)
		const response 			= 	await fetch(`${backendLocation}/${collectionName}/${id}`, { headers, credentials, method, body })
		const item				= 	await response.json()

		return 	response.ok
				?	item
				:	Promise.reject(response)

	}

	async createItem(itemData){
		const backendLocation 	= 	this.config.backendLocation
		const collectionName 	= 	ic.itemConfig.collectionName
		const method			= 	"POST"
		const headers			=	{
										'Accept': 		'application/json',
										'Content-Type':	'application/json',
									}
		const credentials		= 	'include'		
		const body				= 	JSON.stringify(itemData)
		const response 			= 	await fetch(`${backendLocation}/${collectionName}`, { headers, credentials, method, body })
		const item				= 	await response.json()

		return 	response.ok
				?	item
				:	Promise.reject(response)
	}

	async deleteItem(id){
		console.log('DELETE')
		const backendLocation 	= 	this.config.backendLocation
		const collectionName 	= 	ic.itemConfig.collectionName
		const method			= 	"DELETE"
		const credentials		= 	'include'	
		const response 			= 	await fetch(`${backendLocation}/${collectionName}/${id}`, { credentials, method })
		const {count}			= 	await response.json()		

		return 	response.ok && count === 1
				?	{count}
				:	Promise.reject(response)
	}

}

icBackend = new IcBackend(icConfig) // icConfig should be global varibale added by build script.

