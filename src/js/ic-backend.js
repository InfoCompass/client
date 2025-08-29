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

	async getOptions(){
		const backendLocation 	= 	this.config.backendLocation
		const collectionName 	= 	'options'
		const credentials		= 	'include'				

		const response 			= 	await fetch(`${backendLocation}/${collectionName}`, { credentials })
		const options			= 	await response.json()

		return options
	}

	async createOption(option){

		const backendLocation 	= 	this.config.backendLocation
		const collectionName 	= 	'options'
		const method			= 	"POST"
		const headers			=	{
										'Accept': 		'application/json',
										'Content-Type':	'application/json',
									}
		const credentials		= 	'include'		
		const body				= 	JSON.stringify(option)
		const response 			= 	await fetch(`${backendLocation}/${collectionName}`, { headers, credentials, method, body })
		const resultOption		= 	await response.json()

		return 	response.ok
				?	resultOption
				:	Promise.reject(response)
	}

	async updateOption(option){
		const backendLocation 	= 	this.config.backendLocation
		const collectionName 	= 	"options"
		const method			= 	"PUT"
		const headers			=	{
										'Accept': 		'application/json',
										'Content-Type':	'application/json',
									}
		const credentials		= 	'include'		
		const body				= 	JSON.stringify(option)
		const response 			= 	await fetch(`${backendLocation}/${collectionName}/${option.id}`, { headers, credentials, method, body })
		const resultOption		= 	await response.json()

		return 	response.ok
				?	resultOption
				:	Promise.reject(response)

	}

	async deleteOption(id){
		const backendLocation 	= 	this.config.backendLocation
		const collectionName 	= 	"options"
		const method			= 	"DELETE"
		const credentials		= 	'include'	
		const response 			= 	await fetch(`${backendLocation}/${collectionName}/${id}`, { credentials, method })
		const {count}			= 	await response.json()		

		return 	response.ok && count === 1
				?	{count}
				:	Promise.reject(response)
	}

	async getLists(){
		const backendLocation 	= 	this.config.backendLocation
		const collectionName 	= 	'lists'
		const credentials		= 	'include'				

		const response 			= 	await fetch(`${backendLocation}/${collectionName}`, { credentials })
		const lists			= 	await response.json()

		return lists
	}

	async createList(list){

		const backendLocation 	= 	this.config.backendLocation
		const collectionName 	= 	'lists'
		const method			= 	"POST"
		const headers			=	{
										'Accept': 		'application/json',
										'Content-Type':	'application/json',
									}
		const credentials		= 	'include'		
		const body				= 	JSON.stringify(list)
		const response 			= 	await fetch(`${backendLocation}/${collectionName}`, { headers, credentials, method, body })
		const resultList		= 	await response.json()

		return 	response.ok
				?	resultList
				:	Promise.reject(response)
	}

	async deleteList(id){
		const backendLocation 	= 	this.config.backendLocation
		const collectionName 	= 	"lists"
		const method			= 	"DELETE"
		const credentials		= 	'include'	
		const response 			= 	await fetch(`${backendLocation}/${collectionName}/${id}`, { credentials, method })
		const {count}			= 	await response.json()		

		return 	response.ok && count === 1
				?	{count}
				:	Promise.reject(response)
	}

	async updateList(list){
		const backendLocation 	= 	this.config.backendLocation
		const collectionName 	= 	"lists"
		const method			= 	"PUT"
		const headers			=	{
										'Accept': 		'application/json',
										'Content-Type':	'application/json',
									}
		const credentials		= 	'include'		
		const body				= 	JSON.stringify(list)
		const response 			= 	await fetch(`${backendLocation}/${collectionName}/${list.id}`, { headers, credentials, method, body })
		const resultList		= 	await response.json()

		return 	response.ok
				?	resultList
				:	Promise.reject(response)

	}

	async addItemToList(listId, itemId){
		const backendLocation 	= 	this.config.backendLocation
		const collectionName 	= 	"lists"
		const method			= 	"PUT"
		const headers			=	{
										'Accept': 		'application/json',
										'Content-Type':	'application/json',
									}
		const credentials		= 	'include'		
		const body				= 	JSON.stringify({ items: {$push: itemId} } )
		const response 			= 	await fetch(`${backendLocation}/${collectionName}/${listId}`, { headers, credentials, method, body })
		const resultList		= 	await response.json()

		return 	response.ok
				?	resultList
				:	Promise.reject(response)

	}

	async removeItemFromList(listId, itemId){
		const backendLocation 	= 	this.config.backendLocation
		const collectionName 	= 	"lists"
		const method			= 	"PUT"
		const headers			=	{
										'Accept': 		'application/json',
										'Content-Type':	'application/json',
									}
		const credentials		= 	'include'		
		const body				= 	JSON.stringify({ items: {$pull: itemId} } )
		const response 			= 	await fetch(`${backendLocation}/${collectionName}/${listId}`, { headers, credentials, method, body })
		const resultList		= 	await response.json()

		return 	response.ok
				?	resultList
				:	Promise.reject(response)

	}


	async runAction(action, params){
		const backendLocation 	= 	this.config.backendLocation
		const collectionName 	= 	'actions'
		const method			= 	"POST"
		const headers			=	{
										'Accept': 		'application/json',
										'Content-Type':	'application/json',
									}
		const body				=	params
									?	JSON.stringify(params)
									:	undefined
		const credentials		= 	'include'		
		const response 			= 	await fetch(`${backendLocation}/${collectionName}/${action}`, { headers, credentials, method, body })

		let result				

		try{ 
			result	=	await response.json() }
		catch(e){
			result 	=	response.statusText
		}


		return 	response.ok
				?	result
				:	Promise.reject(response)
	}

	async getTiles(){
		const backendLocation 	= 	this.config.backendLocation
		const collectionName 	= 	'tiles'
		const credentials		= 	'include'				

		const response 			= 	await fetch(`${backendLocation}/${collectionName}`, { credentials })
		const tiles				= 	await response.json()

		return tiles
	}


}

icBackend = new IcBackend(icConfig) // icConfig should be global variable added by build script.

