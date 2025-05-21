"use strict";


angular.module('icServices', [
	'icPreload',
	// 'icApi',
	// 'smlLayout',
	// 'pascalprecht.translate'
])


.service('ic',[

	'$q',

	function($q){

		function IcCoreService(){
			this.deferred 	= $q.defer()
			this.ready 		= this.deferred.promise
		}

		return new IcCoreService()
	}
])


.service('icUtils', [

	'$rootScope',

	function($rootScope){

		var scheduled_calls = {}



		icUtils = {

			//call callback after $delay ms, further calls to the same id/callback  within $delay ms are either ignored (defer == false)
			//or the initial call is deferred for another $delay ms
			schedule: function(id, callback, delay, defer){

				scheduled_calls[id] = scheduled_calls[id] || {}

				var promise = 	scheduled_calls[id].promise
								||
								new Promise(function(a,b){ 
									scheduled_calls[id].resolve	= a, 
									scheduled_calls[id].reject 	= b 
								})


				scheduled_calls[id].promise = promise

				if(scheduled_calls[id].timeout && !defer) return promise

				if(scheduled_calls[id].timeout) window.clearTimeout(scheduled_calls[id].timeout)	

				scheduled_calls[id].timeout = 	window.setTimeout(function() {
													var resolve = scheduled_calls[id].resolve
														reject 	= scheduled_calls[id].reject

													delete scheduled_calls[id]

													Promise
													.resolve(callback())
													.then(resolve, reject)

												}, delay)

				return promise

			},

			chunkedJob: function(array, callback, chunk_size, promise){
				var resolve, reject, promise = promise || new Promise(function(a,b){ resolve = a, reject = b })
					

				promise.resolve = promise.resolve	|| resolve				
				promise.reject	= promise.reject	|| reject


				var points	= 0,
					index	= 0

				while( array[index] && points < chunk_size ) {
					points += (callback(array[index]) || 1)
					index ++
				}

				array[index]
				?	window.requestAnimationFrame(function(){ 
						icUtils.chunkedJob(array.slice(index), callback, chunk_size, promise)
					})
				:	promise.resolve()

				return promise

			},

			evalItems: function(expression, scope){
				scope = scope || $rootScope
				return  function(item){
							return scope.$eval(expression, {item: item})
						}	
			},

			waitWhileBusy: function(threshold, last_timestamp, resolve){

				threshold 		= 	threshold || 16
				last_timestamp	= 	last_timestamp || 0
				
				var promise		= 	resolve
									?	null
									:	new Promise(function(a){resolve = a}),
					timestamp 	= 	Date.now(),
					diff		= 	timestamp - last_timestamp

				if(diff <= threshold) return resolve()

				window.requestAnimationFrame(function(){
					icUtils.waitWhileBusy(threshold*1.025, timestamp, resolve)
				})

				return	promise
			},

			stringifyDate: function(dateOrString){

				if(!dateOrString) throw new TypeError("Invalid value for dateOrString", { cause: dateOrstring })

				if(typeof dateOrString == 'string') return dateOrString

				const date 	= dateOrString
				const year	= dateOrString.getFullYear()
				const month	= (dateOrString.getMonth()+1+'').padStart(2,'0')
				const day	= (dateOrString.getDate()+'').padStart(2,'0')

				return `${year}-${month}-${day}`
			},

			parseDate: function (dateOrString){

				if(!dateOrString) throw new TypeError("Invalid value for dateOrString", { cause: dateOrstring })

				if(dateOrString instanceof Date) return dateOrString

				const matches	= dateOrString.match(/(\d\d\d\d)-(\d\d)-(\d\d)/)
				const year		= parseInt(matches[1])
				const month		= parseInt(matches[2])-1
				const day		= parseInt(matches[3])

				return new Date(year, month, day)
			},

			clipDate: function(dateOrString){

				if(!dateOrString) throw new TypeError("Invalid value for dateOrString", { cause: dateOrstring })

				return icUtils.parseDate(icUtils.stringifyDate(dateOrString))
			},

			toggle: function(arr, item, force = undefined){

				if(force === undefined){
					return 	arr.includes(item)
							?	icUtils.toggle(arr, item, false)
							:	icUtils.toggle(arr, item, true)
				}

				const index 	= arr.indexOf(item)
				const missing 	= index == -1

				if( force &&  missing) 	return void arr.push(item)
				if( force && !missing)	return undefined	
				if(!force &&  missing)	return undefined
				if(!force && !missing)	return void arr.splice(index,1)
			},

			log: function(...args){
				console.log(...args)
			}

		}

		return icUtils
	}

])

.service('icAutoFill',[

	'icOverlays',

	function(icOverlays){

		class icAutoFill {

			storeKey		= "icAutoFill"

			newValues 		= {}
			confirmation 	= {}
			currentValues	= {}
			

			constructor(){				
				this.loadValues()
			}

			loadValues(){
				this.currentValues = {}

				const json_from_ls = localStorage.getItem(this.storeKey) || "{}"

				try {
					this.currentValues = JSON.parse(json_from_ls)
				} catch(e) {
					console.error(e)
				}
			}

			get active(){
				return Object.keys(this.currentValues).length > 0
			}

			clearStorage(){
				localStorage.removeItem(this.storeKey)				
				this.loadValues()
			}

			confirmClear(){
				icOverlays.open('confirmationModal', 'INTERFACE.AUTOFILL_CONFIRM')	
				.then( () => this.clearStorage() )
				.then( () => icOverlays.open('popup', 'INTERFACE.AUTOFILL_CLEARED')	 )
			}

			updateValue(key, value){
				this.newValues[key] = value
			}

			toggleConfirmation(key, toggle){
				if(toggle === undefined) return (this.confirmation[key] = !this.confirmation[key])
				this.confirmation[key] = !!toggle 
			}


			storeValues(){				
				const updates = Object.keys(this.newValues)
								.filter( 	key => !!this.confirmation[key])
								.map(		key => [key, this.newValues[key]] )

				updates.forEach( ([key,value]) => {
					this.currentValues[key] = this.currentValues[key] || []

					if(typeof value == 'string' && value.trim()) this.currentValues[key].push(value)

					this.currentValues[key] = Array.from( new Set(this.currentValues[key]) )

				})

				localStorage.setItem(this.storeKey, JSON.stringify(this.currentValues))

			}

		}

		return new icAutoFill()
	}

])

.service('icKeyboard',[


	function(){

		class icKeyboard {

			previousTabbable 


			constructor(){
				document.addEventListener('focusin', this.onFocusIn.bind(this), {passive:true} )
			}

			get nextTabbable(){
				return this.getNextTabbable()
			}

			getNextTabbable(element, relativeTo, selector){

				element 	=  	element 	|| document
				relativeTo 	=	relativeTo 	|| document.activeElement

				const tabbables 	= this.getTabbables(element, selector)

				const active_pos 	= tabbables.indexOf(relativeTo)

				return tabbables[ (active_pos+1) % tabbables.length ]	

			}

			getTabbables(element, selector){
				return 	Array.from(element.querySelectorAll('input, textarea, select, button:not([tabindex="-1"]), a, [tabindex]:not([tabindex="-1"])'))
						.filter( 	element => element.offsetParent && getComputedStyle(element).display != 'none')
						.filter(	element => !selector || element.matches(selector) )
			}

			tabNext(selector){		
				window.requestAnimationFrame( () => this.nextTabbable.focus() )
			}

			tabBack(){
				window.requestAnimationFrame( () => this.previousTabbable.focus() )	
			}

			tabNextInput(){
				window.requestAnimationFrame( () => this.getNextTabbable(null, null, 'input, textarea, button[tabindex]:not([tabindex="-1"])').focus() )
			}


			onFocusIn(event){
				this.previousTabbable = document.activeElement
			}



		}


		return new icKeyboard()

	}
])

.service('icInit', [

	'$q',
	'icUser',
	'icItemStorage',
	'icLists',
	'icLanguages',
	'icTiles',
	'icOptions',
	'icMainMap',
	'icUtils',
	'icWebfonts',
	'icConsent',
	'icRemotePages',
	'plImages',
	'plStyles',
	'plTemplates',
	'$timeout',
	'$rootScope', 

	function($q, icUser, icItemStorage, icLists, icLanguages, icTiles, icOptions, icMainMap, icUtils, icWebfonts, icConsent, icRemotePages, plImages, plStyles, plTemplates, $timeout, $rootScope){


		var icInit 				= 	{},
			blockingPromises 	= 	{
										icUser: 			icUser.ready,
										icItemStorage:		icItemStorage.ready,
										icOptions:			icOptions.ready,	
										icLanguages:		icLanguages.ready,
										icLists:			icLists.ready,
										icWebfonts:			icWebfonts.ready,
										// icRemotePages:	icRemotePages.ready,
										// icTiles:			icTiles.ready,
										plStyles:			plStyles.ready,
										plTemplates:		plTemplates.ready,
									}
			deferredPromises	=	{
										plImages:			plImages.ready,
										icMainMap:			icMainMap.markersReady,
										icRemotePages:		icRemotePages.ready,
										icTiles:			icTiles.ready,
									}

		icInit.ready			= undefined
		icInit.done				= undefined
		icInit.readyCount 		= 0
		icInit.readyMax			= Object.keys(blockingPromises).length
		icInit.errors 			= []
	
		Object.defineProperty(icInit, 'progress', {
			get: 	() => { 

						const i = icInit.readyCount
						const n = icInit.readyMax

						return i/n
					}	
		})

		Object.entries({...blockingPromises, ...deferredPromises}).forEach( ([key, promise]) => {

			return promise.then(

				function(){
					if(key in blockingPromises) icInit.readyCount ++

					console.info( (key+'...').padEnd(25,' ')+'[ok] '+(performance ? performance.measure("ready").duration : '') + 'ms')

					icInit[key] = true

					if(!icInit.ready && icInit.readyCount == icInit.readyMax){

						icInit.ready = true; 
						console.info(`Ready after: ${performance.measure("startup").duration}ms`)
					}
				},
				
				function(e){
					console.error(e)
					console.info( (key+'...').padEnd(25,' ')+'[failed]')
					icInit.errors.push(key)
				}
			)
		})

		//icInit.done is used by the loading screen, i.e. it gets removed when icInit.done == true
		$q.when(Promise.all(Object.values(blockingPromises)))
		//icUtils.waitWhileBusy(20))
		.then( () => icConsent.ready)
		.then( () => icInit.done = true )
		.then( () => {
			plImages.start()
			icRemotePages.start()
			icTiles.start()
		})
		.then( () => console.info(`Done after: ${performance.measure("startup").duration}ms`) )

		return icInit
	}

])



.service('icUser', [

	'$q',

	function($q){

		var icUser = this

		if(!dpd.users) console.error('icUser: missing dpd.users')

		icUser.clear = function(){
			icUser.loggedIn			= false
			icUser.displayName 		= undefined
			icUser.privileges 		= ['suggest_new_items', 'suggest_item_changes']
		}


		icUser.setup = function(){
			return	$q.when(dpd.users.me())
					.then(
						function(user_data){
							if(user_data && user_data.id){
								icUser.loggedIn		= true
								icUser.displayName 	= user_data.displayName
								icUser.privileges	= user_data.privileges 		
								icUser.id			= user_data.id
								return icUser								
							} else {
								icUser.clear()
							}
						},
						function(){
							console.error('icUser: unable to setup user.')							
						}
					)
		}


		icUser.login = function(username, password){
			return 	$q.when(dpd.users.login({
						username: username,
						password: password
					}))
					.then(function(){ location.reload()	})
		}


		icUser.logout = function(){
			return 	$q.when(dpd.users.logout())
					.then(
						function(){ location.reload() },
						function(e){
							console.warn('icUser: logout failed:', e)
							return $q.reject(e)
						}
					)

		}

		icUser.can = function(task){
			return 	icUser.privileges && icUser.privileges.indexOf(task) != -1
		}

		icUser.cannot = function(task){
			return !icUser.can(task)
		}


		icUser.ready = icUser.setup()

		return icUser
	}
])


.service('icConsent',[

	'$q',

	function($q){

		const storageItemName = 'icConsent'

		function getValue(key){
			try{	return JSON.parse(localStorage.getItem(storageItemName))[key] }
			catch{	return undefined }
		}
		
		function setValue(key, value){

			let values 

			try{ 	values = JSON.parse(localStorage.getItem(storageItemName)) || {} }
			catch{	values = {} }

			values[key] = value

			localStorage.setItem(storageItemName, JSON.stringify(values))
		}
		
		function clear(){
			localStorage.removeItem(storageItemName)
		}

		class Consent{

			key

			constructor(key){
				this.key = key
			}

			get isGiven(){
				return  getValue(this.key) === true
			}

			get isKnown(){
				return typeof getValue(this.key) == 'boolean'
			}

			get isDenied(){
				return getValue(this.key) === false
			}
		}




		class icConsent {

			
			cases 				= []
			defer				= $q.defer()
			ready				= this.defer.promise
			promises			= new Set()
			events				= new EventTarget()

			constructor(){}

			get confirmationRequired(){
				return this.confirmationCheckRequired()
			}

			confirmationCheckRequired(cases = this.cases){
				return cases.some( consent_case => !this.to(consent_case.key).isKnown) 
			}

			add(key, server, default_value, custom_prompt = false){

				this.cases.push({key, server, default: default_value, customPrompt: !!custom_prompt})

				return new Consent(key)

			}

			to(key){
				return new Consent(key)
			}

			when(key){

				if(this.to(key).isGiven) 	return Promise.resolve()
				if(this.to(key).isDenied)	return Promise.reject()

				let reject
				let resolve

				const promise = new Promise((s,j) => { resolve = s; reject = j })

				promise.consentKey  = key
				promise.resolve		= resolve
				promise.reject		= reject

				this.promises.add(promise)				

				return $q.resolve(promise)

			}

			set(key, value){
				setValue(key, value)

				this.promises.forEach( promise => {
					const key = promise.consentKey

					if(!this.to(key).isKnown) return null

					this.promises.delete(promise)	

					if(this.to(key).isGiven) 	promise.resolve()
					if(this.to(key).isDenied)	promise.reject('consent denied: '+key)					
				})

				this.events.dispatchEvent( new CustomEvent("change") )

			}

			clear(){
				clear()
				location.reload()
			}

			done(){
				this.defer.resolve()
			}


		}

		return new icConsent()

	}

])

.service('icRemotePages',[

	'$q',
	'icLanguages',
	'icConfig',

	function($q, icLanguages, icConfig){

		class IcRemotePages {

			ready
			deferredStart = $q.defer()

			constructor(){
				this.ready	= 	icConfig.remotePages
								?	this.deferredStart.promise
									.then(() => this.setup())
									.catch(e =>  console.warn(e) )
								:	$q.resolve() 

			}

			deflate(obj, path){
				if(!path) 		return obj
				if(!obj)		return undefined

				const [first, ...rest] = path.split('.')

				return this.deflate(obj[first], rest.join('.'))	

			}

			start(){ this.deferredStart.resolve() }

			async setup(){

				await icLanguages.ready

				const config = icConfig.remotePages

				if(typeof config.url !== 'string') throw new Error('icRemotePages.setup() icConfig.remotePages.url must be a string')

				if(!config.pages) throw new Error('icRemotePages.setup() icConfig.remotePages.pages must be a dictionary')

				if(!config.map) throw new Error('icRemotePages.setup() icConfig.remotePages.map must be a dictionary')

				const {url, pages} = config

				const defaultMap	=	{
											id: 			'id',
											translations: 	'translations'
										}

				const map 			= config.map || defaultMap


				const response 		= await fetch(url)
				const remoteData 	= await response.json()  

				if(!Array.isArray(remoteData)) throw new Error ('icRemotePages.setup() expected remote data to be an Array')

				const pageTranslations = {}

				Object.entries(pages).forEach( ([page, id]) => {
					const idPath			= map.id
					const remotePage		= remoteData.find( entry => this.deflate(entry, idPath) === id)
					
					const translationsPath	= map.translations
					const translations		= this.deflate(remotePage, translationsPath)

					pageTranslations[page] 	= translations
				})

				await icLanguages.ready

				Object.entries(pageTranslations).forEach( ([page, translations]) => {

						icLanguages.availableLanguages.forEach(function(lang){

							if(!translations[lang]) return null


							const body		= translations[lang].content
							const title		= translations[lang].title

							const content	= `<h1>${title}</h1>\n\n${body}`

							lang = lang.toUpperCase()

							if(!icLanguages.translationTable[lang]) return null

							// updating actual page content
							icLanguages.translationTable[lang]['CONTENT'] = icLanguages.translationTable[lang]['CONTENT'] || {}
							icLanguages.translationTable[lang]['CONTENT'][page.toUpperCase()] = content

							// updating title translations for the menu
							icLanguages.translationTable[lang]['INTERFACE'] = icLanguages.translationTable[lang]['INTERFACE'] || {}
							icLanguages.translationTable[lang]['INTERFACE'][page.toUpperCase()] = title

						})
				})

				icLanguages.refreshTranslations()
			}

		}

		return new IcRemotePages()

	}
])

.service('icLists', [

	'$rootScope',
	'$q',
	'icUser',
	'icItemStorage',
	'icLanguages',
	'icTaxonomy',
	'icConfig',

	function($rootScope, $q, icUser, icItemStorage, icLanguages, icTaxonomy, icConfig){

		var icLists = []

		if(!dpd.lists && !icConfig.disableLists) console.error('icLists: missing dpd.lists. Maybe backend is out of date.')

		if(!dpd.lists || icConfig.disableLists){

			console.info('icLists disabled.')
			icLists.disabled = true
			icLists.ready 	= $q.resolve()

			return icLists
		}


		icLists.disabled = false

		icLists.get = function(id){
			return 	id
					?	icLists.find(function(list){ return list.id == id })
					:	$q.reject('icLists.get: missing id')
		}

		icLists.createList = function(name){
			return 	name
					?	$q.when(dpd.lists.post({name:name}))
					:	$q.reject('icLsist.createList: missing name')
		} 

		icLists.removeList = function(id){
			return 	id
					?	$q.when(dpd.lists.del(id))
					:	$q.reject('icLists.removeList: missing id')
		}

		icLists.addItemTolist = function(item_or_id, list_id){

			var item_id = item_or_id.id || item_or_id

			if(!item_id) return $q.reject('icLists.addItemToList: missing item_id')
			if(!list_id) return $q.reject('icLists.addItemToList: missing list_id')

			return $q.when(dpd.lists.put(list_id, { items: {$push: item_id} } ))
		}

		icLists.removeItemFromList = function(item_or_id, list_id){
			
			var item_id = item_or_id.id || item_or_id


			if(!item_id) return $q.reject('icLists.addItemToList: missing item_id')
			if(!list_id) return $q.reject('icLists.addItemToList: missing list_id')

			return $q.when(dpd.lists.put(list_id, { items: {$pull: item_id} } ))
		}

		icLists.itemInList = function(item_or_id, list_id){

			var item_id = item_or_id && item_or_id.id || item_or_id,
				list 	= icLists.get(list_id)

			return list && list.items && list.items.indexOf(item_id) != -1 || false
		}

		icLists.toggleItemInList = function(item_or_id, list_id){
			
			var item_id = item_or_id.id || item_or_id

			return	icLists.itemInList(item_id, list_id)
					?	icLists.removeItemFromList(item_id, list_id)
					:	icLists.addItemTolist(item_id, list_id)

		}

		icLists.updateName = function(list_id, name){
			return $q.when(dpd.lists.put(list_id, { name: name }))
		}

		icLists.togglePublicState = function(list_id, public_state){
			return $q.when(dpd.lists.put(list_id, { public: public_state }))
		}



		icLists.update = function(){
			
			return 	$q.when(dpd.lists.get())
					.then(function(lists){
						while(icLists.length){ icLists.pop() }
						
						return 	$q.all(lists.map(function(list){
									icLists.push(list)
									return afterListAddition(list)
								}))
					})
		}

		//TODO: this is where sockets are used and a cookie header is set!:

		dpd.lists.on("creation", function(list_id){
			$q.when(dpd.lists.get(list_id))
			.then(function(list){
				icLists.push(list)
				list.items = list.items || []

				return afterListAddition(list)

			})
			.catch(function(){ /*nothing to do here*/ })

		})



		dpd.lists.on("update", function(list_id){
			$q.when(dpd.lists.get(list_id))
			.then(function(list){

				var old_list 	= icLists.find(function(l){ return l.id == list_id})
					index		= icLists.indexOf(old_list)


				//list not known yet, mabye acces restriction changed:
				if(index == -1){
					icLists.push(list)
					return afterListAddition(list)
				} else {
					icLists[index] = list
					return afterListUpdate(list, old_list)
				}

			})
			//this may happen if the changes restrict access:
			.catch(function(error){
				var index = icLists.find(function(l){ return l.id == list_id })

				if(index !== -1) icLists.splice(index, 1)
			})
		})


		dpd.lists.on("deletion", function(list_id){

			var index = icLists.findIndex(function(l){ return l.id == list_id})

			if(index != -1){
				afterListRemoval(icLists.splice(index,1))
				$rootScope.$digest()
			}


		})

		function addFilter(list){

			icItemStorage.registerFilter('list_'+list.id, function(item){
				return icLists.itemInList(item, list.id)
			})

			icTaxonomy.addExtraTag('list_'+list.id, 'lists')
		}

		function updateTranslations(list){
			return 	icLanguages.ready
					.then(function(){
						icLanguages.availableLanguages.forEach(function(lang){
							lang = lang.toUpperCase()
							if(!icLanguages.translationTable[lang]) return null
							if(!icLanguages.translationTable[lang]['UNSORTED_TAGS']) return null

							var utl = icLanguages.translationTable[lang]['UNSORTED_TAGS']['LIST'] || 'UNSORTED_TAGS.LIST'

							icLanguages.translationTable[lang]['UNSORTED_TAGS'][('list_'+list.id).toUpperCase()] = utl+' '+list.name

						})
						icLanguages.refreshTranslations()
					})
		}


		function afterListAddition(list){
			
			addFilter(list)

			return updateTranslations(list)
		}

		function afterListUpdate(new_list, old_list){
			old_list.items && old_list.items.forEach(function(item){ icItemStorage.updateItemInternals(item) })
			new_list.items && new_list.items.forEach(function(item){ icItemStorage.updateItemInternals(item) })

			updateTranslations(new_list)
		}




		function afterListRemoval(list){
			list.items && list.items.forEach(function(item){ icItemStorage.updateItemInternals(item) })

			if(!icTaxonomy.tags.lists) return null

			icTaxonomy.tags.lists = icTaxonomy.tags.lists.filter(function(tag){ return tag != 'lists_'+list.id})

		}
		

		icLists.ready = icUser.ready
						.then(icLists.update)

		return icLists
	}
])



.provider('icSite', function(){

	this.config = 	{
						params: 	[],
						switches: 	[],
						sections:	[],
					}

	this.onRegister = function(){}

	this.registerParameter = function(new_parameter){
		/*
			parameter = 	{
								name:  	the key used to exposed value on icSite e.g. ic.site.%name
								encode:	function(value, ic)	to encode value into url string
								decode: function(path, ic) 	to decode value from url string	
								options: array or function
								defaultValue: ...
							}
		 */
		this.config.params.push(new_parameter)
		this.onRegister()
		return this
	}

	this.registerSwitch = function(new_switch){
		/*
			swt =			{
								name: the key used to exposed value on icSite e.g. ic.site.switch.%name
								defaultValue: ...
								index: pos to /encode/decode switch
							}
		 */
		if(new_switch.index === undefined) console.error('icSite.registerSwitch: missing index.')
			//TODO: check index duplicates
		this.config.switches.push(new_switch)
		this.onRegister()
		return this
	}

	this.registerSection = function(new_section){
		/*
			section = 		{
								name:  		the key used to exposed value on icSite e.g. ic.site.activeSection.%name resp. ic.site.displaySection.%name,
								template:	url,
								active: 	function(ic),
								show: 		function(ic),
							}
		 */
		this.config.sections.push(new_section)
		this.onRegister()
		return this
	}



	this.$get = [

		'$location',
		'$q',
		'$rootScope',
		'$timeout',
		'icLayout',
		'ic',

		function($location, $q, $rootScope, $timeout, icLayout, ic){

			var icSite 					= 	this,
				adjustment_scheduled	= 	false

			icSite.activeSections 	=	{}
			icSite.visibleSections 	= 	{}


			//Params:

			function decodeParam(path, param){
				var value 	= 	param.decode(path, ic),
					options = 	typeof param.options == 'function'
								?	param.options(ic)
								:	param.options


				if(options && Array.isArray(value)){
					value.forEach(function(x, index){
						if(options.indexOf(x) == -1) value.splice(index,1)
					})
				} 


				if(!value || (options && !Array.isArray(value) && options.indexOf(value) == -1) ){
					value 	= 	typeof param.defaultValue == 'function'
								?	angular.copy(param.defaultValue(ic))
								:	angular.copy(param.defaultValue)
				}

				return value
			}

			function path2Params(path){
				icSite.config.params.forEach(function(param){
					try {
						icSite[param.name] = decodeParam(path, param)
					} catch(e) {
						console.error('icSite path2Params', param.name ,e)
					}
				})

			}

			function encodeParam(value, param){

				var options			=	typeof param.options == 'function'
										?	param.options(ic)
										:	param.options,

				 	default_value 	=	typeof param.defaultValue == 'function'
										?	param.defaultValue(ic)
										:	param.defaultValue


				if(options && Array.isArray(value)){
					value.forEach(function(x, index){
						if(options.indexOf(x) == -1) value.splice(index,1)
					})
				} 

				if(options && !Array.isArray(value) && options.indexOf(value) == -1){
					value = null
				}

				if(angular.equals(value, default_value)) value = null

				return param.encode(value, ic)
			}


			icSite.getNewPath = function(config){
				var path = ''

				config = config || {}

				icSite.config.params.forEach(function(param){
					try {
						var section = encodeParam(param.name in config ? config[param.name] : icSite[param.name], param)
						if(section)	path += '/' + section
					} catch(e) {
						console.error('icSite params2Path', param.name, e)
					}
				})

				return path || '/'
			}


			icSite.updateFromPath = function(e,n,o){

				path2Params($location.path())
				search2Switches($location.search().s)
				icSite.updateUrl()

				return icSite
			}

			icSite.updatePath = function(){

				var current_path 	= $location.path(),
					new_path		= icSite.getNewPath()
				
				if(current_path != new_path){
					$location.path(new_path).replace()
				}

				return icSite
			}


			icSite.updateUrl = function(){
				icSite.updatePath()
				icSite.updateSearch()

				return icSite
			}


			//Switches:


			function search2Switches(search){
				var binary_str 	= parseInt(search || 0, 36).toString(2),
					length		= binary_str.length

				icSite.config.switches.forEach(function(swt){
					icSite[swt.name] = !!parseInt(binary_str[length-swt.index-1])
				})


			}

			icSite.getNewSearch = function(config){

				var config = config || {}

				if(!icSite.config.switches.length) return null

				var length = 1 + icSite.config.switches.reduce(function(max, swt){ return Math.max(max, swt.index) },0 ),
					arr = Array(length).fill(0),
					s	= '0'

				icSite.config.switches.forEach(function(swt){

					var value = swt.name in config
								?	config[swt.name]
								:	icSite[swt.name]

					arr[length-swt.index-1] = value ? 1 : 0
				})

				s = parseInt(arr.join('') , 2).toString(36)

				return 	s == '0'
						?	null
						:	s
			}


			icSite.updateSearch = function(){
				var current_s 	= $location.search().s,
					new_s		= icSite.getNewSearch()
				
				if(current_s != new_s) $location.search('s', new_s)

				return icSite
			}

			icSite.updateFromSearch = function(){
				search2Switches($location.search().s)
				return icSite
			}


			//sections:


			icSite.updateActiveSections = function(){
				icSite.config.sections.forEach(function(section){
					icSite.activeSections[section.name] = section.active(ic)
				})

				return icSite
			}

			icSite.updateVisibleSections = function(){
				icSite.config.sections.forEach(function(section){
					icSite.visibleSections[section.name] = icSite.activeSections[section.name] && section.show(ic)
				})

				return icSite				
			}

			icSite.updateSections = function(){
				return	icSite
						.updateActiveSections()
						.updateVisibleSections()
			}

			var onRegisterSchedule = false

			icSite.onRegister = function(){ 
				if(onRegisterSchedule) return null
				// Some providers may register Params before service ic is initialized in .run() causing an error if onRegister is called too early
				ic.ready.then(function(){
						onRegisterSchedule = false
						icSite.updateFromPath()
						icSite.updateFromSearch()
				})
				onRegisterSchedule = true
			}

			icSite.adjust = function(){
				var changed = false

				icSite.config.params.forEach(function(param){ 

					var new_value = param.adjust 	? param.adjust(ic) : icSite[param.name]

					if(new_value!= icSite[param.name]){
						icSite[param.name] = new_value
						changed = true
					}

				}),

				icSite.config.switches.forEach(function(swt){ 
					var new_value = swt.adjust 	? swt.adjust(ic) : icSite[swt.name]

					if(new_value!= icSite[swt.name]){
						icSite[swt.name] = new_value
						changed = true
					}
				})

				return changed
			}

			icSite.print = function(){
				try {
					window.print()
				} catch(e) {
					console.log(e)
					if(!document.execCommand('print', true, null)) console.warn('cannot oen print dialog via execCommand')
				}


			}


			$rootScope.$watch(
				function(){
					var state = {}

					icSite.config.params.forEach(function(param){ state[param.name] = icSite[param.name]	})
					icSite.config.switches.forEach(function(swt){ state[swt.name]	= icSite[swt.name]		})

					state.layoutMode = icLayout.mode.name

					return state 
					
				},
				function(new_state, old_state){

					ic.ready.then(function(){
						icSite
						.updateSections()
						.updateUrl()
						.adjust()	

						$q.resolve(icUtils.schedule('adjustParameters', icSite.adjust, 30, true))

					})
				},
				true
			)

			
			$rootScope.$watch(
				function(){ return $location.search().s},
				function(s){
					ic.ready.then(function(){ icSite.updateFromSearch() })
				}
			)

			$rootScope.$on('$locationChangeSuccess', function(){		
				icSite.updateFromPath()						
			})


			return icSite
			
		}
	]
})


.provider('icAdmin', function(){


	this.$get = [

		'$q',
		'icOverlays',
		'icLanguages',
		'icItemStorage',
		'icItemEdits',
		'icItemConfig',

		function($q, icOverlays, icLanguages, icItemStorage, icItemEdits, icItemConfig){
			var icAdmin = this


			icAdmin.updateTranslations = function(){

				icOverlays.open('spinner')

				return 	$q.when(dpd.actions.exec('updateTranslations'))
						.then(
							function(){
								icLanguages.refreshTranslations()
								return 	icOverlays.open('confirmationModal', 'INTERFACE.TRANSLATION_UPDATED')
										.then( () => location.reload() ) 
							},

							function(){
								return icOverlays.open('popup', 'INTERFACE.UNABLE_TO_UPDATE_TRANSLATIONS')
							}
						)
			}		

			icAdmin.autoTranslate = function(item){


				var icItem			= item,
					icEdit			= icItemEdits.get(item.id),
					from_languages 	= [].concat(['en', 'de'], icLanguages.availableLanguages),
					to_languages	= icLanguages.availableLanguages


				icOverlays.toggle('spinner', true)


				return $q.when(dpd.actions.exec('translateItem', {
							item:		icItem.id,
							from:		from_languages,
							to:			to_languages
						}))
						.then(function(item_data){
							var translation_data = {}

							icItemConfig.properties.forEach(function(property){
								if(property.translatable){
									icItem[property.name] = item_data[property.name]
									icEdit[property.name] = item_data[property.name]
								}
							})

						})
						.then(
							function(){
								return icOverlays.open('popup', 'INTERFACE.ITEM_TRANSLATION_UPDATED')
							},

							function(e){
								console.error(e)
								return icOverlays.open('popup', 'INTERFACE.UNABLE_TO_UPDATE_ITEM_TRANSLATIONS')
							}
						)

				}

			return icAdmin
		}
	]
})



.service('icMatomo', [

	'$rootScope',
	'icConfig',
	'icInit',
	'icSite',
	'icLayout', 
	'icItemStorage',
	'icUtils',
	'icUser',
	'$translate',

	function($rootScope, icConfig, icInit, icSite, icLayout, icItemStorage, icUtils, icUser, $translate){

		if(
				!icConfig.matomo 
			||	typeof icConfig.matomo.url 		!= 'string' 
			||	typeof icConfig.matomo.siteId	!= 'string'

		) return { matomo: 'not enabled or invalid config'}



		class IcMatomo {

			visitIdKey				=	"ic-matomo-visit-id"
			lastInteractionKey		=	"ic-matomo-last-interaction"
			returnNoticeKey			=	"ic-matomo-return-notice"
			maxInteractionGapHours	=	1
			maxInteractionGapTime	=	1000*60*60*this.maxInteractionGapHours 
			url						=	icConfig.matomo.url+'/matomo.php'
			siteId					=	icConfig.matomo.siteId
			defaultParams			=	{
											idsite: 		this.siteId,
											rec:			1,											
											apiv:			1,									
										}

			paramQueue				=	[] 
			submissionBufferTime	=	1000 // milliseconds

		
			constructor(){}								


			async getDefaultParams(config = {}){

				const visitId 			= 	config.noId
											?	undefined
											:	await this.getVisitId()
				return 	{	
							...this.defaultParams,
							lang:	icSite.currentLanguage,
							_id:	visitId,
							cid:	visitId,
							rand:	String(Math.random()).replace('0.',''),
						}
			}		

			lastReferrer	=	{
									visitId:	undefined,
									referrer:	undefined
								}

			async getReferrer(){

				const visitId 			= 	await this.getVisitId()

				const refHandledEarlier = 	visitId && this.lastReferrer && this.lastReferrer.visitId == visitId

				const referrer			=	refHandledEarlier
											?	document.location.origin // referrer for this visit already used
											:	URL.canParse(document.referrer)
											?	new URL(document.referrer).origin
											:	""

				this.lastReferrer		=	{ visitId, referrer }
				
				return referrer
			}				

			async submit(params){

				
				const visitIds	=	Array.from( new Set(params.map( p => p._id) ) )

				console.groupCollapsed('Posting to Matomo with visitId(s):', ...visitIds)

				params.forEach( p => console.dir(p) )

				console.groupEnd()			
					
				const requests	=	params
									.map( p =>`?${new URLSearchParams(p)}`)			

				const method	= 	'POST'
				const body		= 	JSON.stringify({ requests })	

				return await fetch( this.url, { method, body })
			}

			deferedBulkSubmit(forceImmediate = false){


				setTimeout(

					() => {


						if(this.paramQueue.length == 0) return

						const firstVisitId 	= this.paramQueue[0]._id

						const params		= this.paramQueue.filter( r => r._id == firstVisitId)

						this.paramQueue		= this.paramQueue.filter( r => r._id != firstVisitId) 			
					
						this.submit(params)
						.catch( e => {
							this.paramQueue.push(...params)
						})

						if(this.paramQueue.length) this.deferedBulkSubmit()

					},

					forceImmediate
					?	0
					:	this.submissionBufferTime
				)		

				
			}	
			
			async log(params){

				if(icUser.loggedIn){
					console.info("Usage analysis disabled for logged in users")
					return
				}
									
				const defaultParams		=	await this.getDefaultParams()

				const rawParams			= 	Array.isArray(params)
											?	params
											:	[params]									

				const suppParams		=	rawParams
											.map( p => ({
												...defaultParams,
												...p
											}))
				
				this.paramQueue.push(...suppParams)	

				this.deferedBulkSubmit()	
				
			}

			// LAST INTERACTION						
			
			async clearLastInteraction(){
				localStoarge.removeItem(this.lastInteractionKey)
			}

			async renewLastInteraction(){

				const timestamp 	= Date.now()
				const description	= `When last interaction is unknown or took place more than ${this.maxInteractionGapHours} hour(s) ago, prematurely resets the visitId.`

				localStorage.setItem(this.lastInteractionKey, JSON.stringify({timestamp, description}))

				console.info('Renewing last interaction', new Date(timestamp))

				return timestamp
			}			

			async loadLastInteraction(){

				let liData = JSON.parse(localStorage.getItem(this.lastInteractionKey))

				if(!liData) 							throw new Error("No record of last interaction in localStorage.")

				if(typeof liData.timestamp != 'number')	throw new Error("Last interaction timestamp is not a number.")

				return liData.timestamp
			}		

			async getLastInteraction() {
				return await this.loadLastInteraction()
			}

			async assertLastInteractionWithinThreshold() {

				const lastInteraction 	= await this.getLastInteraction()
				const now				= Date.now()

				// .TODO: clear LI when all tabs are closed? Check if gap works
				// ALSO: weekly users!

				if(now-lastInteraction > this.maxInteractionGapTime) 	throw new Error("Last interaction past threshold.")

			} 


			
			// VISIT ID		

			async calculateVisitId(baseId){				

				const today			= 	new Date()
				const salt			= 	icUtils.stringifyDate(today)
				const encoder		= 	new TextEncoder()
				const encodedId		= 	encoder.encode(baseId+salt)

				const hashBuffer	= 	await crypto.subtle.digest('SHA-256', encodedId)
				const hashArray 	= 	Array.from(new Uint8Array(hashBuffer))
				const hashHex		= 	hashArray
										.map((b) => b.toString(16).padStart(2, "0"))
										.join("")
				const hashHex16		=	hashHex.slice(0,16)						

				return hashHex16

			}

			async resetVisitId(){

				const random		= 	new Uint8Array(8)

				crypto.getRandomValues(random)

				const randomArray	= 	Array.from(random)
				const randomHex		= 	randomArray
										.map((b) => b.toString(16).padStart(2, "0"))
										.join("")

				const baseId		=	randomHex
				const dateStr		=	icUtils.stringifyDate( new Date() )
				const description	=	`This id will never be transmitted (only a hash with a daily changing salt), it will also be replaced whenever the date changes or the last interaction took place more than ${this.maxInteractionGapHours} hour(s) ago.`
				
				const data			=	{ baseId, dateStr, description }

				localStorage.setItem(this.visitIdKey, JSON.stringify(data))

				console.info('Resetting visit baseId to:', data)

				return this.calculateVisitId(randomHex)
			}

			async loadBaseId(){

				const today				= new Date()

				const liRawData 		= localStorage.getItem(this.visitIdKey)

				const {baseId, dateStr}	= JSON.parse(liRawData)

				if(!liRawData) 			throw new Error("No baseId data in localStorage.")

				if(!baseId) 			throw new Error("No baseId in localStorage.")
				if(!dateStr)			throw new Error("No dateStr in localStorage.")

				const todayStr			= icUtils.stringifyDate(today)

				if(dateStr != todayStr) throw new Error("Date changed")

				return baseId	
			}	


			getVisitIdBuffer	= {}

			async getVisitId(){

				const todayStr = icUtils.stringifyDate(new Date() )

				if( 
						this.getVisitIdBuffer.date == todayStr
					&&	this.getVisitIdBuffer.promise

				) return await this.getVisitIdBuffer.promise

				let 	resolve, reject	
				const 	promise 	= new Promise( (res, rej) => { resolve = res; reject = rej })	

				this.getVisitIdBuffer = { date: todayStr, promise }

				let visitId = undefined

				try{

					await this.assertLastInteractionWithinThreshold()

					const baseId 	= await this.loadBaseId()

					visitId 		= await this.calculateVisitId(baseId)
					

				} catch(e) {
					console.groupCollapsed('Resetting dailyId due to: '+ e.message)
					console.error(e)
					console.groupEnd()
					visitId			= await this.resetVisitId()

				}

				this.getVisitIdBuffer = {}				

				this.renewLastInteraction()

				resolve(visitId)

				return visitId

			}

			async visitPage(page){

				const referrer	=	await this.getReferrer()

				const params 	= 	{
										url:			`${window.location.origin}/p/${page}`,
										action_name:	`page/${page}`,
										urlref:			referrer
									}

				await this.log(params)
			}



			async viewItem(item){

				const params = 	{
									url:			`${window.location.origin}/item/${item.id}`,
									action_name:	`item/${item.title}`
								}

				await this.log(params)
			}

			async search(term, count){

				const params = 	{
									url:			`${window.location.origin}/s/${term}`,									
									search:			term,									
								}

				await this.log(params)
			}

			async useLanguage(lang) {

				const params = 	{
									e_c:		'Settings',
									e_a:		'Use Language',
									e_n:		lang,
									dimension1: lang

								}

				await this.log(params)
			}

			async viewSections(sections){

				if(!sections)			return
				if(!sections.length) 	return

				const params	=	sections.map( section => ({ 
										e_c:		'Layout',
										e_a:		'Section',
										e_n:		section,
										dimension3:	section

									}))

				await this.log(params)		
			}

			async setLayout(mode){

				if(!mode) return

				const params 	= 	{
										e_c:		'Layout',
										e_a:		'Mode',
										e_n:		mode,
										dimension2: mode

									}

				await this.log(params)		

			}

			async setFilters([types, categories, tags]){

				const tTypes 		= 	await Promise.all( types.map( 		t => $translate('TYPES.'+t.toUpperCase()			, null, null, null, 'de')))
				const tCategories 	= 	await Promise.all( categories.map( 	t => $translate('CATEGORIES.'+t.toUpperCase()		, null, null, null, 'de')))
				const tTags 		=	await Promise.all( tags.map( 		t => $translate('UNSORTED_TAGS.'+t.toUpperCase()	, null, null, null, 'de')))

				const tFilters		= 	[...tTypes, ...tCategories, ...tTags]

					
				if(!tFilters)			return
				if(!tFilters.length) 	return

				const params		=	tFilters.map( filter => ({
											e_c:		'Filter',
											e_a:		'any',
											e_n:		filter,
											dimension4:	filter
										}))		
				
				await this.log(params)		

			}

			noteReturn(){

				const returnJson	= localStorage.getItem(this.returnNoticeKey)
				const today			= icUtils.stringifyDate(new Date())
				const description 	= "The date will not be transmitted. Used to tell Matomo about a return visit, without Matomo actually recognizing you." 

				let	lastVisit
				let lastNotification

				try { 

					const returnData		= 	JSON.parse(returnJson) 
					lastNotification		= 	returnData.lastNotification
					lastVisit				= 	returnData.lastVisit || lastNotification

				} catch(e) {}

				const todaysDate			= icUtils.parseDate(today)
				const lastNotificationDate	= lastNotification 		&& icUtils.parseDate(lastNotification) || undefined
				const notifiedThisWeek		= lastNotificationDate 	&& (todaysDate.getTime()-lastNotificationDate.getTime() < 1000*60*60*24*7)

				if(notifiedThisWeek){
					lastVisit				= 	today

					localStorage.setItem(this.returnNoticeKey, JSON.stringify({ lastVisit, lastNotification, description }) )

					return					
				}
				
				let returnVisitScope		= 	"first-time"

				if(lastVisit){

					const lastVisitDate		=	icUtils.parseDate(lastVisit)

					if(todaysDate.getTime()-lastVisitDate.getTime() >  0)					returnVisitScope = "less-than-a-week"
					if(todaysDate.getTime()-lastVisitDate.getTime() >  1000*60*60*24*7)		returnVisitScope = "over-a-week"
					if(todaysDate.getTime()-lastVisitDate.getTime() >  1000*60*60*24*30)	returnVisitScope = "over-a-month"	
				}

				const params				=	{
													e_c:		'Return Visit',
													e_a:		'interval',
													e_n:		returnVisitScope,
													dimension5: returnVisitScope
												}

				void this.log(params)

				lastVisit 					= today	
				lastNotification			= today

				localStorage.setItem(this.returnNoticeKey, JSON.stringify({ lastVisit, lastNotification, description }) )

			}



			startTracking(){

				this.noteReturn()

				window.addEventListener('visibilitychange', event => {					
					 if (document.hidden) this.deferedBulkSubmit(true)
				})

				$rootScope.$watch( 
					()			=>  icSite.visibleSections.page && icSite.page || undefined, 
					page 		=>	void this.visitPage(page)
				)

				$rootScope.$watch( 
					() 			=> icSite.visibleSections.item && icSite.activeItem || undefined, 
					item		=> { if(item) void this.viewItem(icSite.activeItem) }
				)

				$rootScope.$watch( 
					() 			=> icSite.currentLanguage, 
					language	=> { if(icSite.currentLanguage) void this.useLanguage(icSite.currentLanguage) }
				)

				$rootScope.$watch( 
					() 			=> icLayout && icLayout.mode && icLayout.mode.name || undefined, 
					mode		=> { if(mode) void this.setLayout(mode) }
				)



				$rootScope.$watch( () => icSite.searchTerm, () => {

					const searchTerm = icSite.searchTerm 

					if(!searchTerm) return 

					setTimeout(
						() => {							
							const count = 	searchTerm == icSite.searchTerm
											?	icItemStorage.filteredList.length
											:	undefined

							void this.search(searchTerm, count)
						},
						500
					)	

				})

				$rootScope.$watch( () => icSite.visibleSections, (current, previous) => {					

					const sections = Object.keys(icSite.visibleSections).filter( key => icSite.visibleSections[key])

					void this.viewSections(sections)
				}, true)

				$rootScope.$watch( () => [icSite.filterByType, icSite.filterByCategory, icSite.filterByUnsortedTag] , (all_filters) => {					
					void this.setFilters(all_filters)
				}, true)




			}

		}

		icMatomo = new IcMatomo()

		console.log({ IcMatomo })

		const stopWatching =	$rootScope.$watch( () => icInit.done, () => {
									if(icInit.done){
										stopWatching()
										icMatomo.startTracking()
									}
								})


		return IcMatomo
	}
])



.provider('icStats', [

	function(){

		var url = undefined

		this.setUrl = function(u){
			url = u
		}

		this.$get = [
			'$rootScope',
			'$http',
			'icSite',
			'icOverlays',

			function($rootScope, $http, icSite, icOverlays){

				var icStats = {}

				icStats.statItem = function(id){
					if(!url) 	return null
					if(!id)		return null
					return	$http.post(url+'/item/'+id).catch( function(){} )
				}

				icStats.statSearch = function(search_term){
					if(!url) 			return null
					if(!search_term)	return null
					return	$http.post(url+'/search/'+encodeURIComponent(search_term)).catch( function(){} )
				}

				icStats.statPrintItem = function(id){
					if(!url) 	return null
					if(!id)		return null
					return	$http.post(url+'/print/'+id).catch( function(){} )
				}

				icStats.statLanguage = function(lang){
					if(!url) 	return null
					if(!lang)	return null
					return	$http.post(url+'/language/'+lang).catch( function(){} )
				}

				icStats.statShareItem	= function(id){
					if(!url) 	return null
					if(!id)		return null
					return	$http.post(url+'/share/'+id).catch( function(){} )
				}

				icStats.statPrintItem = function(id){
					if(!url) 	return null
					if(!id)		return null
					return	$http.post(url+'/print/'+id).catch( function(){} )

				}


				var checked = {}


				$rootScope.$watch(
					function(){ return icSite.activeItem && icSite.activeItem.id },
					function(new_id, old_id){ 
						if(!checked.item || new_id != old_id) icStats.statItem(new_id) 
						checked.item = true	
					}
				)

				$rootScope.$watch(
					function(){ return icSite.searchTerm },
					function(new_search_term, old_search_term){ 
						if(!checked.search || new_search_term != old_search_term) icStats.statSearch(new_search_term) 
						checked.search = true	
					}
				)
			
				$rootScope.$watch(
					function(){ return icSite.currentLanguage },
					function(new_language, old_language){ 
						if(!checked.language || new_language != old_language) icStats.statLanguage(new_language) 
						checked.language = true	
					}
				)
		
				var last_share = undefined

				$rootScope.$watch(
					function(){ return icOverlays.show.sharingMenu	},
					function(){
						if(last_share == (icSite.activeItem && icSite.activeItem.id)) return null
						if(icOverlays.show.sharingMenu) icStats.statShareItem(icSite.activeItem && icSite.activeItem.id)
						last_share = icOverlays.show.sharingMenu && (icSite.activeItem && icSite.activeItem.id)
					}
				)


				/* print stat */

				var mediaQueryList = window.matchMedia('print'),
					last_print = undefined

				function tryStatShare(){
					if(last_print == (icSite.activeItem && icSite.activeItem.id)) return null
					icStats.statPrintItem(icSite.activeItem && icSite.activeItem.id)
					last_print = (icSite.activeItem && icSite.activeItem.id)
				}

				mediaQueryList.addListener(function (mql) {
					if(mql.matches) tryStatShare()
				})

				window.onbeforeprint = tryStatShare




				return this
			}
		]

	}
])





.provider('icItemStorage', function(){

	var itemStorage = undefined

	this.setItemStorage = function(is){ itemStorage = is}

	this.$get = [

		'$q',
		'$rootScope',
		'icUser',
		'icTaxonomy',
		'icConfig',
		'icItemConfig',

		function($q, $rootScope, icUser, icTaxonomy, icConfig, icItemConfig){

			if(!itemStorage) console.error('Service icItemStorage:  itemStorage missing.')

			var icItemStorage = itemStorage

			icItemStorage.addAsyncTrigger(function(){ $rootScope.$applyAsync() })


			icItemStorage.ready 		= 	icUser.ready
											.then(function(){

												const publicItems 	= icConfig.publicItems || icConfig.publicItems+'/items' || undefined 	
												const mappoUrl		= icConfig.mappo || undefined	

												return 	$q.when(icItemStorage.downloadAll( icUser.can('edit_items') ? null : { publicItems, mappoUrl }) )
											})
											.then(function(){
												return icItemStorage.updateFilteredList()
											})

			icItemStorage.newItem = function(id){

				var num = 0

				while(icItemStorage.data.some(function(item){ return item.id == 'new_'+num })){	num++ }

				const new_id 			= 	'new_'+num
				const original_item 	= 	id && icItemStorage.data.find( item => item.id == id)
				const original_data		= 	original_item
											?	original_item.exportData()
											:	{}

				var item = 	icItemStorage.storeItem({
								...original_data,
								id: 	'new_'+num,
								state:	icUser.can('edit_items') ? 'draft' : 'suggestion'
							})

				item.internal.new = true

				return item
			}


			icUser.ready.then(function(){


				if(icUser.can('edit_items')){

					icItemStorage.ready
					.then(function(){
						icItemStorage.registerFilter('state_public', 			function(item){ return item.state == 'public' 		})
						icItemStorage.registerFilter('state_draft', 			function(item){ return item.state == 'draft' 		})
						icItemStorage.registerFilter('state_suggestion',	 	function(item){ return item.state == 'suggestion' 	})
						icItemStorage.registerFilter('state_archived', 			function(item){ return item.state == 'archived' 	})

						if(icItemConfig.properties.map(property => property.name).includes('proposals')){						
							icItemStorage.registerFilter('state_has_proposals', item => item.proposals && item.proposals.length)
						}
					})

					icTaxonomy.addExtraTag('state_public', 			'state')
					icTaxonomy.addExtraTag('state_draft', 			'state')
					icTaxonomy.addExtraTag('state_suggestion',		'state')
					icTaxonomy.addExtraTag('state_archived', 		'state')					

					if(icItemConfig.properties.map(property => property.name).includes('proposals')){
						icTaxonomy.addExtraTag('state_has_proposals', 	'state')
					}

				}				

				icTaxonomy.addExtraTag('remote')

				icItemStorage.ready
				.then( () => {	
					icItemStorage.registerFilter('remote', item => item.remoteItem != undefined)
				})


			})



			$rootScope.$watch(
				function(){
					return !icItemStorage.refreshScheduled && icItemStorage.refreshRequired
				},
				function(refresh){


					if(!refresh) return null

					icItemStorage.refreshScheduled = true


					$rootScope.$evalAsync(function(){
						icItemStorage.refreshFilteredList()
						icItemStorage.refreshScheduled	=	false
					})

					return icItemStorage
				}
			)


			return icItemStorage
		}
	]
})


.provider('icItemConfig', function(){

	var itemConfig = undefined
	
	this.setItemConfig 	= function(ic){ itemConfig 	= ic; return this}

	this.$get = [
		function(){
			if(!itemConfig) console.error('icItemConfig: itemConfig missing. You should probably load dpd-item-config.js.')

			return itemConfig
		}
	]
})




.service('icItemRef', [

	'icItemConfig',
	'icItemStorage',

	function(icItemConfig, icItemStorage){

		class icItemRef{

			project(item, keys){

				if(!item) 	return null
				if(!keys) 	return null

				if( Array.isArray(keys) ) return Object.fromEntries( keys.map ( key => ([key, this.project(item, key)]) ))					 	

				const key =	keys

				if(typeof key != 'string') console.log('icItemRef.project: key is not a string', key)

				const property = icItemConfig.properties.find( prop => prop.name == key )

				if(!property) 					return item[key]
				if(!property.project)			return item[key]
				if(!item[property.project])		return item[key]

				const referredItem = icItemStorage.getItem(item[property.project])

				return referredItem[key]

			}	

		}

		return new icItemRef()

	}
])

.provider('icTaxonomy',function(){

	var taxonomy	= undefined
		

	function IcCategory(config){
		this.name 		= config.name
		//make sure no tags appear twice
		this.tags		= config.tags.filter(function(v, i, s) { return s.indexOf(v) === i } )
		this.colors		= config.colors || []
		this.pos		= config.pos || null
	}

	function IcType(config){
		this.name	= config.name
	}

	this.setTaxonomy	= function(tx){ taxonomy 	= tx; return this}

	this.$get = [

		'icLanguages',

		function(icLanguages){

			if(!taxonomy) 	console.error('icTaxonomy: taxonomy missing. You should probably load taxonomy.js.')

			var icTaxonomy = this

			icTaxonomy.categories 	= []
			icTaxonomy.types		= []
			icTaxonomy.tags 		= taxonomy.tags|| {}
			icTaxonomy.lor			= taxonomy.lor || []
			icTaxonomy.extraTags	= []

			Object.defineProperty(icTaxonomy, 'subCategories', {
				get: function() { return this.categories.map( category => category.tags).flat() }
			})


			icTaxonomy.addCategory = function(cat_config){
				icTaxonomy.categories.push(new IcCategory(cat_config))
				return icTaxonomy
			}


			taxonomy.categories.forEach(function(cat_config){
				icTaxonomy.addCategory(cat_config)
			})

			icTaxonomy.addType = function(type_config){
				icTaxonomy.types.push(new IcType(type_config))
				return icTaxonomy
			}

			taxonomy.types.forEach(function(type_config){
				icTaxonomy.addType(type_config)
			})

			icTaxonomy.addUnsortedTag = function(tag){
				icTaxonomy.tags.misc.push(tag)
				return icTaxonomy
			}

			icTaxonomy.addExtraTag = function(tag, group_name){
				group_name = group_name || 'extra'
				icTaxonomy.tags				= icTaxonomy.tags || {} 
				icTaxonomy.tags[group_name] = icTaxonomy.tags[group_name] || []
				icTaxonomy.tags[group_name].push(tag)
				return icTaxonomy
			}

			
			icTaxonomy.lor.forEach( dst => {
				icTaxonomy.addExtraTag(dst.tag, 'lor_dst')
				dst.pgr.forEach( pgr =>{
					icTaxonomy.addExtraTag(pgr.tag, 'lor_pgr')
					pgr.bzr.forEach( bzr => {
						icTaxonomy.addExtraTag(bzr.tag, 'lor_bzr')
					})
				})
			})


			icLanguages.ready
			.then(function(){
				icLanguages.availableLanguages.forEach(function(lang){
					lang = lang.toUpperCase()
					if(!icLanguages.translationTable[lang]) return null
					if(!icLanguages.translationTable[lang]['UNSORTED_TAGS']) return null

					;(icTaxonomy.tags.lor_dst || [] ).forEach( dst => {
						const name = icTaxonomy.getDistrict(dst).name
						if(name) icLanguages.translationTable[lang]['UNSORTED_TAGS'][dst.toUpperCase()] = name
					})

					;(icTaxonomy.tags.lor_pgr || [] ).forEach( pgr => {
						const name = icTaxonomy.getPrognoseraum(pgr).name
						if(name) icLanguages.translationTable[lang]['UNSORTED_TAGS'][pgr.toUpperCase()] = name
					})

					;(icTaxonomy.tags.lor_bzr || [] ).forEach( bzr => {
						const name = icTaxonomy.getBezirksregion(bzr).name
						if(name) icLanguages.translationTable[lang]['UNSORTED_TAGS'][bzr.toUpperCase()] = name
					})


				})
				icLanguages.refreshTranslations()
			})





			//Todo: move this into build script:
			//check if all tags are accounted for in categories:
			function checkTagsInCategories(){
				var tag_in_cat = {}

				icTaxonomy.categories.forEach(function(category){
					category.tags.forEach(function(tag){
						if(tag_in_cat[tag]) console.warn('icTaxonomy: tag in multiple categories:'+ tag + ' in '+ category.name + ' and ' + tag_in_cat[tag])
						tag_in_cat[tag] = category.name
					})
				})

				//Todo

				// itemConfig.tags.forEach(function(tag){
				// 	if(!tag_in_cat[tag]) console.warn('icTaxonomy: tag not accounted for in Catgories:', tag)
				// })
			}

			checkTagsInCategories()
			
			icTaxonomy.getCategories = function(haystack){


				if(!haystack) return []

				haystack = 	haystack.filter
							?	haystack
							:	[haystack]
				
				haystack = haystack.filter(function(t){ return !!t})

				var result = 	icTaxonomy.categories.filter(function(category){
									return 	haystack.some(function(c){
												return 	(c.name || c) == category.name
											})
								})

				if(result.length == 0){
					// this is only relevant if the tags are incoherent (if a subcategory exists without category)
					result = 	icTaxonomy.categories.filter(function(category){
									return 	haystack.some(function(c){
												return 	category.tags.indexOf((c.name || c)) != -1
											})
								})
				}


				return	result
			}

			icTaxonomy.getCategory = function(haystack){
				return icTaxonomy.getCategories(haystack)[0]
			}


			icTaxonomy.getSubCategories = function(haystack){
				if(!haystack) return []
					
				haystack = 	typeof haystack == 'string'
							?	[haystack]
							:	haystack

				return 	haystack.filter(function(t){
							return 	icTaxonomy.categories.some(function(category){
										return 	category.tags.indexOf(t.name || t) != -1
									})
						})
			}


			icTaxonomy.getType = function(haystack){
				if(!haystack) return null

				haystack = 	Array.isArray(haystack)
							?	haystack
							:	[haystack]

				var result = 	icTaxonomy.types.filter(function(type){
									return haystack.indexOf(type.name) != -1
								})
				return	result[0]
			}


			icTaxonomy.getUnsortedTags = function(haystack, tag_group){

				if(!haystack) return null

				haystack = 	typeof haystack == 'string'
							?	[haystack]
							:	haystack


				var tags 	= 	tag_group 
								?	icTaxonomy.tags[tag_group] || []
								:	Object.keys(icTaxonomy.tags)
									.reduce(function(acc, key){ return acc.concat(icTaxonomy.tags[key]) }, []) 
			
				return	haystack.filter(function(tag){ return tags.indexOf(tag) != -1 })
			}

			icTaxonomy.getUnsortedTagPath = function(tag){
				const [group_key, group] = 	Object.entries(icTaxonomy.tags)
											.find( ([key, tag_group]) => tag_group.includes(tag) )
											|| [undefined, undefined]
									
				return	group_key
						?	`UNSORTED_TAGS.${group_key.toUpperCase()}.${tag.toUpperCase()}`
						:	null
			}


			icTaxonomy.getDistrict = function(haystack){
				if(!haystack) return null

				haystack = 	Array.isArray(haystack)
							?	haystack
							:	[haystack]

				return 	icTaxonomy.lor.find(function(district){
							return haystack.indexOf(district.tag) != -1
						})
				
			}

			icTaxonomy.getPrognoseraum = function(haystack){
				if(!haystack) return null

				haystack = 	Array.isArray(haystack)
							?	haystack
							:	[haystack]

				let result

				icTaxonomy.lor.forEach(function(district){
					district.pgr.forEach( pgr => {
						if(haystack.includes(pgr.tag) ) result = pgr
					})
				})
				
				return result
			}

			icTaxonomy.getBezirksregion = function(haystack){
				if(!haystack) return null

				haystack = 	Array.isArray(haystack)
							?	haystack
							:	[haystack]

				let result

				icTaxonomy.lor.forEach(function(district){
					district.pgr.forEach( pgr => {
						pgr.bzr.forEach( bzr => {
							if(haystack.includes(bzr.tag) ) result = bzr
						})
					})
				})
				
				return result
			}


			icTaxonomy.isType = function(tag){
				return 	icTaxonomy.types
						.map( category => category.name)
						.includes(tag)
			}

			icTaxonomy.isCategory = function (tag){
				return 	!!icTaxonomy.categories
						.map( category => category.name)
						.includes(tag)
			}

			icTaxonomy.isSubCategory = function(tag){
				return icTaxonomy.getSubCategories(tag).includes(tag)
			}

			icTaxonomy.isUnsortedTag = function(tag){
				return 	Object.values(icTaxonomy.tags)
						.flat()
						.includes(tag)
			}

			icTaxonomy.getTagKind = function(tag){
				if(icTaxonomy.isType(tag)) 			return 'types'
				if(
					icTaxonomy.isCategory(tag)
					||
					icTaxonomy.isSubCategory(tag)
				) 									return 'categories'
				if(icTaxonomy.isUnsortedTag(tag)) 	return 'unsorted_tags'					

				return undefined	
			}

			icTaxonomy.isTag = function(tag){				
				return !!icTaxonomy.getTagKind(tag)
			}

			return icTaxonomy
		}
	]
})

.service('icExport',[

	'$translate',
	'$http',
	'icTaxonomy',
	'icConfig',

	function($translate, $http, icTaxonomy, icConfig){

		class icExport {

			async getCSV(lang, properties, tagGroups){
				lang = lang || 'de'

				const {$get, ...taxonomy} 	= icTaxonomy
				const publicItems 			= icConfig.publicItems || icConfig.publicItems+'/items' || undefined 		

				if(!publicItems) throw new Error("Missing publicApi in config")

				const result = await $http.post(`${publicItems}/export/${lang}/csv`, {...icConfig.export, taxonomy } )

				location.href = `${publicItems}/export/${lang}/csv`
			}

		}

		return new icExport()
	}

])

.service('icFilterConfig',[

	'$rootScope',
	'icSite',
	'icItemStorage',
	'icTaxonomy',
	'icLanguages',
	'icItemConfig',
	'icOptions',

	function($rootScope, icSite, icItemStorage, icTaxonomy, icLanguages, icItemConfig, icOptions){
		icSite.sortDirectionAlpha = 1;
		icSite.sortDirection = -1;
		var icFilterConfig = this

		icSite
		.registerParameter({
			name: 			'searchTerm',
			encode:			function(value, ic){
								if(!value) return ''
								return 's/'+value 
							},
			decode:			function(path, ic){
								var matches = path.match(/(^|\/)s\/([^\/]*)/)

								return (matches && matches[2]) || null
							}
		})
		.registerParameter({
			name:			'filterByCategory',
			encode:			function(value, ic){
								var j = value && value.join

								return j ? 'c/'+value.join('-')	: ''
							},
			decode:			function(path, ic){
								var matches = path.match(/(^|\/)c\/([^\/]*)/)
								var result	= Array.from( new Set( (matches && matches[2].split('-')) || [] ))	

								return result
							},
			options:		function(ic){

								var result = []

								ic.taxonomy.categories.forEach(function(category){
									result.push(category.name)
									result.push(...category.tags)
								})
								return result
							},
			defaultValue:	[]

			// adjust:			function(ic){

			// 					var mainCategory = ic.taxonomy.getCategory(ic.site.filterByCategory)

			// 					return	mainCategory && ic.site.filterByCategory.indexOf(mainCategory.name) == -1
			// 							?	ic.site.filterByCategory.concat([mainCategory.name])
			// 							:	ic.site.filterByCategory
			// 				}
		})
		.registerParameter({
			name:			'filterByType',
			encode:			function(value, ic){
								var j = value && value.join && value.join('-')								

								return j ? 't/'+value.join('-')	: ''
							},
			decode:			function(path, ic){
								var matches = path.match(/(^|\/)t\/([^\/]*)/)
								var result	= Array.from( new Set( (matches && matches[2].split('-')) || [] ))	

								return result
							},
			options:		function(ic){
								return ic.taxonomy.types.map(function(t){ return t.name})
							},
			defaultValue:	[]
		})		

		.registerParameter({
			name:			'filterByUnsortedTag',
			encode:			function(value, ic){
								var j = value && value.join && value.join('-')								

								return j ? 'u/'+value.join('-')	: ''
							},
			decode:			function(path, ic){
								var matches = path.match(/(^|\/)u\/([^\/]*)/)
								var result	= Array.from( new Set( (matches && matches[2].split('-')) || [] ))	

								return result
							},
			options:		function(ic){

								// Some option might become available during initialization.
								// If it is not ready, do not block any option, for they will get removed from the url!
								if(!ic.init.ready) return null

								var result = []

								for(group in ic.taxonomy.tags){
									result.push.apply(result, ic.taxonomy.tags[group])
								}

								return result
							},
			defaultValue:	[]
		})

		.registerParameter({
			name:			'sortOrder',
			encode:			function(value, ic){
								if(!value) return ''

								return 'o/'+value 
							},
			decode:			function(path, ic){
								var matches = path.match(/(^|\/)o\/([^\/]*)/)

								return matches && matches[2]
							},
			defaultValue:	function(ic){ return 'alphabetical_'+ic.site.currentLanguage }
		})

		.registerParameter({
			name:			'sortDirection',
			encode:			function(value, ic){
								if(value != -1 && value != 1) return ''

								return (value == -1 ?  'desc' : 'asc')
							},
			decode:			function(path, ic){
								var matches = path.match(/(^|\/)(asc|desc)/)

								return matches && matches[2] && (matches[2] == 'asc' ? 1 : -1)
							},
			options:		[1, -1],
			defaultValue:	-1
		})

		.registerParameter({
			name:			'sortDirectionAlpha',
			encode:			function(value, ic){
								if(value != -1 && value != 1) return ''

								return (value == -1 ?  'desc' : 'asc')
							},
			decode:			function(path, ic){
								var matches = path.match(/(^|\/)(asc|desc)/);
								var matchOrder = path.match(/(^|\/)(last_change)/);
								if(!matchOrder || matchOrder[2] != "last_change" && matches){
									return matches && matches[2] && (matches[2] == 'asc' ? 1 : -1)
								}
							},
			options:		[1, -1],
			defaultValue:	1
		})


		icFilterConfig.toggleType = function(type_name, toggle, replace){



			var pos 	= 	icSite.filterByType.indexOf(type_name),
				toggle 	= 	toggle === undefined
							?	pos == -1
							:	!!toggle

							
			if(replace) icFilterConfig.clearType()

			if(pos == -1 &&  toggle) 				icSite.filterByType.push(type_name)
			if(pos != -1 && !toggle && !replace) 	icSite.filterByType.splice(pos,1)

			return icFilterConfig

		}

		icFilterConfig.clearType = function(){
			while(icSite.filterByType.pop());
			return icFilterConfig
		}

		icFilterConfig.typeActive = function(type_name){
			return icSite.filterByType.indexOf(type_name) != -1
		}

		icFilterConfig.typeCleared = function(){
			return !icSite.filterByType.length
		}







		icFilterConfig.toggleCategory = function(category_name, toggle, replace, complement_categories){

			var pos 	= 	icSite.filterByCategory.indexOf(category_name),
				toggle 	= 	toggle === undefined
							?	pos == -1
							:	!!toggle

			if(replace){
				if(Array.isArray(complement_categories)){
					complement_categories
					.filter(	cc => cc != category_name)
					.forEach( 	cc => icFilterConfig.toggleCategory(cc, false) )

				} else {
					icFilterConfig.clearCategory()
				}
			}

			if(pos == -1 &&  toggle) 				return !!icSite.filterByCategory.push(category_name)
			if(pos != -1 && !toggle && !replace) 	return !!icSite.filterByCategory.splice(pos,1)
		}

		icFilterConfig.clearCategory = function(tags = undefined){

			tags = [...(tags || icSite.filterByCategory)]

			tags.forEach( tag => {
				const pos = icSite.filterByCategory.indexOf(tag)
				if(pos != -1) icSite.filterByCategory.splice(pos,1)
			})

			return icFilterConfig
		}

		icFilterConfig.categoryActive = function(category_name){

			if(Array.isArray(category_name)) return category_name.some( tag => icFilterConfig.categoryActive(tag) )

			const direct_match 	= icSite.filterByCategory.includes(category_name)	
			
			const categories	= icTaxonomy.getCategories(icSite.filterByCategory)

			const sub_match		= categories.some( cat => cat.name == category_name)

			return  direct_match || sub_match
		}

		icFilterConfig.categoryCleared = function(){
			return !icSite.filterByCategory.length
		}







		icFilterConfig.toggleUnsortedTag = function(tag, toggle){

			var pos 	= 	icSite.filterByUnsortedTag.indexOf(tag),
				toggle 	= 	toggle === undefined
							?	pos == -1
							:	!!toggle

			if(pos == -1 &&  toggle) return !!icSite.filterByUnsortedTag.push(tag)
			if(pos != -1 && !toggle) return !!icSite.filterByUnsortedTag.splice(pos,1)

		}

		icFilterConfig.clearUnsortedTag = function(tags){
			tags = tags || angular.copy(icSite.filterByUnsortedTag)

			tags.forEach(function(tag){
				var pos = icSite.filterByUnsortedTag.indexOf(tag)
				if(pos != -1) icSite.filterByUnsortedTag.splice(pos,1)
			})

			return icFilterConfig
		}

		icFilterConfig.unsortedTagActive = function(tag){
			return icSite.filterByUnsortedTag.indexOf(tag) != -1
		}

		icFilterConfig.unsortedTagCleared = function(tags){

			if(!tags) return icSite.filterByUnsortedTag.length == 0

			return tags.every(function(tag){ return icSite.filterByUnsortedTag.indexOf(tag) == -1 })
		}



		icFilterConfig.toggleSortOrder = function(sortCriterium, keep_direction){
			icSite.sortOrder == sortCriterium
			?	keep_direction || icFilterConfig.toggleSortDirection()
			:	icSite.sortOrder = sortCriterium

			icSite.sortDirectionAlpha = 1;
			icSite.sortDirection = -1;

			return icFilterConfig
		}

		icFilterConfig.toggleSortDirection = function(dir){
			icSite.sortDirection = dir || (icSite.sortDirection *-1);
			return icFilterConfig
		}

		icFilterConfig.toggleSortDirectionAlpha = function(dir){
			icSite.sortDirectionAlpha = (icSite.sortDirectionAlpha * -1);
			return icFilterConfig
		}

		//TDODO: check

		icItemStorage.ready
		.then(function(){
			//register sorting criteria after everything has donwloaded:		
			

			//alphabetical:
			

			function prepareLanguageSorting(language_code){
				return	icItemStorage.registerSortingCriterium(
							'alphabetical_'+language_code, 
							function(item_1, item_2){
								return item_1.title.localeCompare(item_2.title, language_code)
							},
							{
								type:		'alphabetical',
								property:	'title',
								param:		language_code
							}
						)
			}

			var prio_language = icSite.currentLanguage

			;(
				prio_language
				?	prepareLanguageSorting(prio_language)
				:	Promise.resolve()
			)
			.then(function(){
				icLanguages.availableLanguages
				.filter(function(language_code){ 
					return 		language_code != prio_language
							&& 	language_code != 'none'
				})
				.forEach(prepareLanguageSorting)
			})

			if(icSite.currentLanguage) icSite.sortOrder = 'alphabetical_'+icSite.currentLanguage
			
			$rootScope.$watch(
				function(){ return icSite.currentLanguage },
				function(){
					if(icSite.currentLanguage && icSite.sortOrder && icSite.sortOrder.match(/^alphabetical_/)){
						icSite.sortOrder = 'alphabetical_'+icSite.currentLanguage
					}
				}
			)

			// start date:
			
			icItemStorage.registerSortingCriterium('start_date', function(item_1, item_2){
				var date_str_1 = String(item_1.startDate || ""),
					date_str_2 = String(item_2.startDate || "")

				if(date_str_1 == date_str_2) return 0

				return date_str_1 > date_str_2 ? 1 : -1
			})


			// last change:
			
			icItemStorage.registerSortingCriterium('last_change', function(item_1, item_2){
				var timestamp_1 = item_1.lastEditDate || item_1.creationDate || 0,
					timestamp_2 = item_2.lastEditDate || item_2.creationDate || 0

				if(timestamp_1 == timestamp_2) return 0

				return timestamp_1 > timestamp_2 ? 1 : -1
			})

		})



		const adHocTranslation = function(x){
			// this is a hack
			// it is meant to support translation of tags; especially list/option tag
			// $translate is async, using it would require too much refactoring

			if(typeof x != 'string') 			return 	[]

			if(!x.match(/^[0-9a-zA-Z_-]+$/))	return 	[]	
			if(!x.match(/[a-zA-Z]/))			return 	[]

			const optionLabel = icOptions.getLabel(x)

			if(optionLabel) return [optionLabel]

			const tagKind = icTaxonomy.getTagKind(x)

			if(tagKind)		return	(Object.values(icLanguages.translationTable) || [])
										.map( table => 		table 
															&&	table[tagKind.toUpperCase()] 
															&&	table[tagKind.toUpperCase()][x.toUpperCase()]
										)
										.filter(x => !!x)



			return []

		}


		$rootScope.$watch(
			function(){
				// Tag groups:
				return 	[
							icSite.filterByType,
							icSite.filterByCategory,
							icSite.filterByUnsortedTag,
							icItemStorage.getSearchTag(icSite.searchTerm, x => adHocTranslation(x) ),
						]
			},
			arr => {

				icItemStorage.ready
				.then( () => {
					icItemStorage.updateFilteredList(arr, [
						// Groups considered alternative to the above tags groups, only one tag of these groups can be active
						icTaxonomy.types.map(function(type){ return type.name }), 
						icTaxonomy.categories.map( category => [category.name, ...(category.tags||[]) ] ).flat(), 
						null, 
						null
					])

					//updateFilteredList() will sort anyway!
					//if(icSite.sortOrder) icItemStorage.sortFilteredList(icSite.sortOrder, icSite.sortDirection)
				})
			},
			true
		)

		$rootScope.$watchCollection(
			function(){
				return 	[
							icSite.sortOrder,
							icSite.sortDirection,
							icSite.sortDirectionAlpha
						]
			},

			function(){
				icItemStorage.ready
				.then(function(){
					let order = icSite.sortOrder.split('_')[0];
					if(order == "alphabetical"){
						icItemStorage.sortFilteredList(icSite.sortOrder, icSite.sortDirectionAlpha)
					} else{
						icItemStorage.sortFilteredList(icSite.sortOrder, icSite.sortDirection)
					}

				})
			}
		)

	}
])






.service('icItemEdits', [

	'icItemStorage',
	'$q',

	function icItemEdits(icItemStorage, $q){

		if(!(window.ic && window.ic.Item)) console.error('icItemEdits: missing IcItem. Please load dpd-items.js')


		var data 		= [],
			icItemEdits = this

		icItemEdits.get = function(item_or_id){


			if(!item_or_id) 			return null
			if(item_or_id.remoteItem)	return null

			var id			= 	item_or_id.id || item_or_id,
				original	= 	icItemStorage.getItem(id),
				edit 		= 	data.filter(function(itemEdit){
									return itemEdit.id == id
								})[0]
				
			if(!edit){
				edit = new ic.Item({id:id})

				data.push(edit)

				if(original.internal.new){
					edit.importData(original.exportData())
				} else {
					$q.when(original.download())
					.then(function(){
						edit.importData(original.exportData())
					})
				}

			}


			return edit
		}

		icItemEdits.clear = function(item_or_id){
			data = 	data.filter(function(itemEdit){
						return itemEdit.id != (item_or_id.id || item_or_id)
					})
		}


		return icItemEdits
	}
])





.service('icLanguages', [

	'$window',
	'$rootScope',
	'$q',
	'$http',
	'$translate',
	'icSite',
	'icUser',
	'icConfig',
	'onScreenFilter',

	function($window, $rootScope, $q, $http, $translate, icSite, icUser, icConfig, onScreenFilter){

		var icLanguages 				= 	this

		icLanguages.availableLanguages	=	[]

		icLanguages.translationTable	=	{}

		icLanguages.guessedLanguage		=	undefined

		icLanguages.ready 				= 	$http.get(icConfig.backendLocation+'/translations.json')
											.then(
												function(result){
													return icLanguages.translationTable = objectKeysToUpperCase(result.data)
												},
												function(){
													return $q.reject("Unable to load language data.")
												}
											)
											.then( () => icUser.ready )
											.then( () => {
												icLanguages.availableLanguages	=	[
																						...(icConfig.languages ? icConfig.languages : []),
																						...(icUser.can('update_translations') && icConfig.adminLanguages ? icConfig.adminLanguages : []),
																					].filter( (x, index, arr) =>  arr.indexOf(x) == index)

												if(icLanguages.availableLanguages.length == 0){
													icLanguages.availableLanguages = ['de', 'en', 'none']
													console.warn('icLanguages: config does not provide available languages!')
												}

											})
											.then( () => {
												icLanguages.guessedLanguage = 		icLanguages.getStoredLanguage()
																				|| 	(navigator.language && navigator.language.substr(0,2) )
																				|| 	(navigator.userLanguage && navigator.userLanguage.substr(0,2) )
												
												if(icLanguages.availableLanguages.includes(icLanguages.guessedLanguage)) return;

												icLanguages.guessedLanguage = icLanguages.getDefaultLanguage()

												if(icLanguages.availableLanguages.includes(icLanguages.guessedLanguage)) return;

												icLanguages.guessedLanguage = null												


											})


		icLanguages.getDefaultLanguage = function() {
			//must only depend on icConfig!
			return icConfig.defaultLanguage || (icConfig.languages||[])[0] || 'en'
		}


		function objectKeysToUpperCase(obj){
			var up = {}

				for(var key in obj){

					up[key.toUpperCase()] = typeof obj[key] == 'object'
											?	objectKeysToUpperCase(obj[key])
											:	obj[key]
				}

			return up
		}

		icLanguages.refreshTranslations = function(){
			$translate.refresh()
		}

		icLanguages.getStoredLanguage = function(){
			var l = $window.localStorage.getItem('language') 

			return	icLanguages.availableLanguages.indexOf(l) != -1
					?	l
					:	null
		}

		icLanguages.setStoredLanguage = function(language){
			$window.localStorage.setItem('language', language)			
		}

		icLanguages.addUniformTranslations = async function(path, map){

			await	icLanguages.ready

			path = 	Array.isArray(path)
					?	path
					:	[path]

			icLanguages.availableLanguages.forEach(function(lang){
				lang = lang.toUpperCase()

				let subTable = icLanguages.translationTable[lang]
				
				if(!subTable) return null

				path.forEach( part => {					
					subTable[part.toUpperCase()] = subTable[part.toUpperCase()] || {}
					subTable = subTable[part.toUpperCase()]
				})

				Object.entries(map).forEach( ([key, value]) => subTable[key.toUpperCase()] = value)


			})

			icLanguages.refreshTranslations()

		}

		icSite.registerParameter({
			name: 			'currentLanguage',
			encode:			function(value, ic){
								if(!value) return ''
								return 'l/'+value 
							},

			decode:			function(path,ic){
								var matches = path.match(/(^|\/)l\/([^\/]*)/)

								return matches && matches[2] || ic.site.currentLanguage || icLanguages.guessedLanguage

							},

			options:		() => icLanguages.availableLanguages,			

		})


		$rootScope.$watch(
			function(){ return icSite.currentLanguage }, 
			function(){

				if(!icSite.currentLanguage) return null

				$translate.use(icSite.currentLanguage)
				icLanguages.setStoredLanguage(icSite.currentLanguage)
			}
		)


		return	icLanguages
	}

])



.factory('icInterfaceTranslationLoader', [

	'icLanguages',

	function(icLanguages){
		return 	function(options){
					if(!options || !options.key) throw new Error('Couldn\'t use icInterfaceTranslationLoader since no language key is given!')
					return 	icLanguages.ready
							.then( function(){ return icLanguages.translationTable[options.key.toUpperCase()] })
				}
	}
])



.service('icFavourites',[

	'$rootScope',
	'icItemStorage',
	'icTaxonomy',
	'icConfig',

	function($rootScope, icItemStorage, icTaxonomy, icConfig){


		var icFavourites = this,
			items = JSON.parse(localStorage.getItem('icFavourites') || '[]')

		icFavourites.contains = function(item_or_id){
			if(!item_or_id) return false

			var id 		= 	item_or_id.id || item_or_id
				
			return items.indexOf(id) != -1
		}

		icFavourites.toggleItem = function(item_or_id, toggle){
			var id 		= 	item_or_id.id || item_or_id,
				pos 	= 	items.indexOf(id)

			toggle 	= 	toggle === undefined
						?	pos == -1
						:	!!toggle

			var add 	= (pos == -1 &&  toggle),
				remove 	= (pos != -1 && !toggle)

			if(add) 	items.push(id)		
			if(remove) 	items.splice(pos,1)

			if(add || remove) icItemStorage.updateItemInternals(item_or_id)
			return icFavourites
		}

		icFavourites.addItem = function(item_or_id){
			icFavourites.toggleItem(item_or_id, true)
		}

		icFavourites.removeItem = function(item_or_id){
			icFavourites.toggleItem(item_or_id, false)
		}

		icItemStorage.ready
		.then(function(){
			icItemStorage.registerFilter('favourite', function(item){
				return icFavourites.contains(item) 
			})
		})

		//if this is missing the favourite page will allway show all entries!
		icTaxonomy.addExtraTag('favourite', 'lists')
	
		
		

		$rootScope.$watch(
			function(){
				return items
			},
			function(){
				localStorage.setItem('icFavourites', JSON.stringify(items))				
			},
			true
		)

		return icFavourites
	}
])








.service('icOverlays', [

	'$q',

	function($q){
		var icOverlays 	= 	{
								show:		{},
								messages:	{},
								deferred:	{},
							},
			scope 		=	undefined,
			deferred	=	{}




		icOverlays.toggle = function(overlay_name, open, leave_others_open){

			if(overlay_name) {
				icOverlays.show[overlay_name] = open !== undefined 
												?	open 
												:	!icOverlays.show[overlay_name]

			}


			if(leave_others_open) return this

			for(var key in icOverlays.show){
				//close all other overlays
				if(key != overlay_name) 	delete icOverlays.show[key]

				if(!icOverlays.show[key]){
					delete icOverlays.messages[key]
				}
			}

			if(icOverlays.active()) return this

			//reject all promises 
			for(var key in icOverlays.deferred){
				if(icOverlays.deferred[key]){
					icOverlays.deferred[key].reject()
					delete icOverlays.deferred[key]
				}
			}

			return this
		}

		icOverlays.open = function(overlay_name, messages, deferred, overwrite_messages){
			icOverlays.messages[overlay_name] = overwrite_messages
												? 	[]
												:	(icOverlays.messages[overlay_name] || [])

			if(!Array.isArray(messages))	messages = [messages]								

			messages.forEach( message => {
				if(icOverlays.messages[overlay_name].indexOf(message) == -1) icOverlays.messages[overlay_name].push(message)
			})	

			if(icOverlays.deferred[overlay_name] && icOverlays.deferred[overlay_name] != deferred) 
				icOverlays.deferred[overlay_name].reject()

			icOverlays.deferred[overlay_name] = deferred || $q.defer()
			
			// It's okay if noone else catches the cancelation of the overlay, that's actually happens alot.g
			// This way js wont throw an error for an uncaught rejection:
			icOverlays.deferred[overlay_name].promise.catch( () => {} )


			icOverlays.toggle(overlay_name, true)

			return icOverlays.deferred[overlay_name].promise
		}

	
		icOverlays.active = function(){
			for(var key in icOverlays.show){
				if(icOverlays.show[key]) return true
			}

			return false
		}

		icOverlays.registerScope = function(s){
			if(scope) console.warn('icOverlays.registerScope: scope already registered.')
			scope = s
		}

		icOverlays.$digest = function(){
			scope.$digest()
		}


		return icOverlays
	}

 ])


.service('icAutoPopupService',[

	'icOverlays',

	function(icOverlays) {

		class IcAutoPopupService {

			currentId 	= undefined
			blocked		= {}

			constructor(){
				try{
					this.blocked = JSON.parse(localStorage.getItem('blockPopups')) || {}
				} catch(e) { console.log(e) }

			}

			//
			async open(id, message){


				if(this.blocked[id]) throw "autoPopup block: "+id

				const previousPromise = icOverlays.deferred['autoPopup'] || Promise.resolve()

				icOverlays.toggle('autoPopup', false)

				await previousPromise.catch( () => {}) // wait for the promise to be resolved or rejected

				this.currentId = id

				return 	icOverlays.open('autoPopup', message)
						.finally( () => this.currentId = undefined)

			}

			close(){
				icOverlays.toggle('autoPopup', false)
			}

			toggle(id, force){

				this.blocked[id] 	= 	force === undefined
										?	!this.blocked[id]
										:	!!force

				localStorage.setItem('blockPopups', JSON.stringify(this.blocked))

			}

			toggleCurrent(force){
				this.toggle(this.currentId, force)
			}



		}	

		return new IcAutoPopupService()
	}
	

])


.service('icTiles', [

	'$q',
	'icConfig',
	'icLanguages',

	function($q, icConfig, icLanguages){

		var icTiles 		= []
		let deferredStart 	= $q.defer()

		function addTileTranslation(id, translations){
			
			const translationStringPrefix 		= "TILES".toUpperCase()
			const translationStringSuffix 		= `TILE-${id}`.toUpperCase()
			const translationKeyTitle			= `HEADER_${translationStringSuffix}`.toUpperCase()
			const translationKeyDescription		= `CONTENT_${translationStringSuffix}`.toUpperCase()
			const translationStringTitle		= `${translationStringPrefix}.${translationKeyTitle}`.toUpperCase()
			const translationStringDescription	= `${translationStringPrefix}.${translationKeyDescription}`.toUpperCase()


			icLanguages.availableLanguages.forEach(function(lang){

				if(!translations[lang]) return null

				const title			= translations[lang].title || ''
				const description	= translations[lang].description || ''

				lang = lang.toUpperCase()

				if(!icLanguages.translationTable[lang]) return null

				
				icLanguages.translationTable[lang][translationStringPrefix] 							= icLanguages.translationTable[lang][translationStringPrefix] || {}
				icLanguages.translationTable[lang][translationStringPrefix][translationKeyTitle]	 	= title

				icLanguages.translationTable[lang][translationStringPrefix] 							= icLanguages.translationTable[lang][translationStringPrefix] || {}
				icLanguages.translationTable[lang][translationStringPrefix][translationKeyDescription] 	= description				

			})	

			return [translationStringTitle, translationStringDescription]
		}

		
		async function getTileData(){
			
			const useDpdAsTileSource 	= !icConfig.tilesUrl
			const useExternalTileSource = !useDpdAsTileSource

			if(useDpdAsTileSource){

				if(!dpd.tiles){
					console.warn('icTiles: missing dpd.tiles')
					return []
				}

				return await dpd.tiles.get()
			}

			// Needs entry in config.json { ..., tilesUrl : '...', ...}
			if(useExternalTileSource){

				let result
				let rawDate

				console.log('Trying', icConfig.tilesUrl)

				try {
					result 	= await fetch(icConfig.tilesUrl)
					rawData = await result.json() 
				} catch(e){
					console.warn('Unable to load tiles!')
					console.error(e)
					return []
				}

				await icLanguages.ready

				const tiles = rawData.map(item => {
					
						const [label, description] = addTileTranslation(item.id, item.translations)

				        return {
				            label,
				            description,
				            color: item.color,
				            link: item.tileLink,
				            icon: item.icon,
				            backgroundUrl: item.background,
				            background: undefined,
				            stretch: item.stretch,
				            order: item.order,
				            bottom: item.bottom,
				        };
				    });


				icLanguages.refreshTranslations()

				return tiles
			}
		}


			/* 
				     See pratials/ic-tiles.html
				     Every Tiles(-Data) looks like this:
				     {
				             label           : string        // Label/title on the tile, should be a translation string, normal strings work too though
				             description     : string        // Subtitle/paragraph on the tile, should be a translation string, normal strings work too though
				             color           : string        // As used in css color properties
				             link            : string        // avoid absolute urls, to prevent page reloads
				             icon            : string        // css icon class name without the 'icon-' prefix, same as filename in raw_icons without extension
				             background      : string        // css image class name without the 'image-prefeix' same as filename in large without extension
				             stretch         : boolean       // truthy/falsey is suffices; wether or not the tile stretches a full row
				             order           : number        // Where to put the tile
				             bottom          : boolean       // truthy/falsey is suffices; wether or not the subtile is shown on the bottom of the tile instead of the top
				     }
			*/

		icTiles.setup = async function(){

			const tile_data = await $q.when(getTileData())

			if(!tile_data.length) console.warn('icTiles: no tiles defined.')

			tile_data.forEach( tile =>{

				const label 		=	tile.label 			&& tile.label.trim()
				const description	=	tile.description	&& tile.description.trim()
				const color			=	tile.color			&& tile.color.trim()
				const link			=	tile.link			&& tile.link.trim()
				const icon			=	tile.icon			&& tile.icon.trim()
				const background	=	tile.background		&& tile.background.trim()
				const backgroundUrl	=	tile.backgroundUrl	&& tile.backgroundUrl.trim()
				const stretch		=	!!tile.stretch
				const order			=	tile.order
				const bottom		=	!!tile.bottom

				icTiles.push({
					label,
					description,
					color,
					link,
					icon,
					background,
					backgroundUrl,
					stretch,
					order,
					bottom
				})
			})	
			
		}

		icTiles.start = function(){ deferredStart.resolve() }
		icTiles.ready = deferredStart.promise
						.then( () => icTiles.setup() )

		return 	icTiles
				

	}
])


.service('icOptions', [

	'$q',
	'icUser',
	'icTaxonomy',
	'icLanguages',

	function($q, icUser, icTaxonomy, icLanguages){


		class icOptions {

			
			constructor(){

				if(!dpd.options){
					console.warn('icOptions: missing dpd.options')
					this.ready = $q.resolve()
					return;
				} 

				this.ready = this.setup()

			}

			setup(){
				return 	$q.when(dpd.options.get())
						.then( options => {
							if(!options.length) console.warn('icOptions: no options defined.')
							this.options= options
							this.keys = Array.from( new Set( options.map( option => option.key )))

							const map = {}
							this.options.forEach( option => {
								icTaxonomy.addExtraTag(option.tag, 'options_'+option.key) 
								map[option.tag] = option.label
							})

							return icLanguages.addUniformTranslations('UNSORTED_TAGS', map)

						})	
			}

			addKey(...keys){
				keys.forEach( key => {
					if(!this.keys.includes(key)) this.keys.push(key)
				})
			}

			generateTag(option){

				option = option || {}

				let clean = (option.label||'')
							.replace(/[^a-zA-Z\s]/gi, '')
							.replace(/([A-Z])/g,' $1')
							.split(/\s/)
							.filter( s => !!s)

				let str_1 	= 	clean
								.filter( s => s.length > 3)
								.map( (s, i) => s.substr(0, i ? 1 : 3) )
								.join('')
								.substr(0,8)

				
				let str_2 	= 	clean
								.filter( s => s.length > 3)
								.map( (s, i) => s.substr(0, 3) )
								.join('')
								.substr(0,8)


				let str_3 	= 	clean
								.map( s => s.substr(0,2) )
								.join('')				
								.substr(0,8)							

				let str_4 	= 	clean
								.join('')
								.substr(0,8)
										
				let str		=	str_1

				if(str.length < 6) str = str_2
				if(str.length < 6) str = str_3
				if(str.length < 6) str = str_4
				

				return `o_${option.key||''}_${str}`.toLowerCase()			
			}

			sanitizeTag(tag){
				if(!tag) return tag
				return tag.replace(/[^a-zA-Z0-9_-]/g,'').toLowerCase().trim()
			}

			sanitizeKey(key){
				if(!tag) return tag
				return key.replace(/[^a-zA-Z0-9_-]/g,'').toLowerCase().trim()
			}

			sanitizeLink(link){
				if(!link) return link

				
				if(!link.match(/^http/)) link = `https://${link}`

				return link.trim()
			}

			sanitizeOption(option){
				option.tag 	= this.sanitizeTag(option.tag)
				option.key 	= this.sanitizeTag(option.key)
				option.link = this.sanitizeLink(option.link)
			}

			addOption(option){
				if(!icUser.can('edit_options')) return $q.reject('icOptions.addOption: unauthorized')

				return 	$q.when(dpd.options.post(option))
						.then( o => {
							this.options.push(o) 
							this.addKey(o.key)
							return o
						})
			}

			updateOption(option){
				if(!icUser.can('edit_options')) return $q.reject('icOptions.updateOption: unauthorized')	

				return 	$q.when(dpd.options.put(option))
						.then( o => {							
							this.options.splice(this.options.findIndex( x => x.id == o.id), 1, o)
							return o
						 })
			}

			removeOption(option){
				if(!icUser.can('edit_options')) return $q.reject('icOptions.removeOption: unauthorized')

				return 	$q.when(dpd.options.del(option.id || option))
						.then( () =>  {
							const pos = this.options.findIndex( o => o.id == option.id)
							this.options.splice(pos,1)
						})
			}

			getOptions(item_or_tags, key){

				const tags = item_or_tags.tags || item_or_tags

				return this.options.filter( option => tags.includes(option.tag) && (!key || option.key == key))

			}

			getLabel(tag){
				const option = this.options.find( o => o.tag == tag)

				return option && option.label
			}

		}

		return 	new icOptions()

	}
])




.service('icWebfonts', [

	'$q',
	'ic',
	'icConfig',
	'icConsent',

	function($q, ic, icConfig, icConsent){

		class IcWebfonts {

			ready

			constructor(){
				this.setup()
			}

			isAvailable(fontFamily){

				if(!fontFamily) return false

				const test_string 	= 	"abcdefghijklmnopqrstuvwxyz"

				const container		=	document.createElement('div')
				const mono_span 	= 	document.createElement('span')
				const font_span		= 	document.createElement('span')

				const shared_style	=	{
											fontSize:	'32px',
											fontWeight: 500,
											display:	'inline',
											position:	'absolute'
										}

				Object.entries(shared_style).forEach( ([key, value]) => {
					mono_span.style[key] = value
					font_span.style[key] = value
				})

				mono_span.style.fontFamily 	= 'monospace'			
				font_span.style.fontFamily 	= `${fontFamily}, monospace`

				const mono_text = document.createTextNode(test_string)
				const font_text = document.createTextNode(test_string)

				mono_span.appendChild(mono_text)
				font_span.appendChild(font_text)

				container.style.position		= 'fixed'
				container.style.opacity			= 0
				container.style.pointerEvents	= 'none'

				container.appendChild(mono_span)
				container.appendChild(font_span)

				document.body.appendChild(container)

				const mono_width 		= mono_span.clientWidth
				const font_width		= font_span.clientWidth

				const font_available 	= mono_width != font_width

				mono_span.remove()
				font_span.remove()
				container.remove()

				return font_available

			}


			loadCss(url){

				var link	= document.createElement('link')
				
				link.href	= url
				link.rel	= 'stylesheet'
				link.type	= 'text/css'

				const promise = new Promise( (resolve, reject) => { link.onload = () => resolve(); link.onerror = reject })

				document.head.appendChild(link);				

				return promise
			}

			setup() {

				const config = icConfig.webfonts

				if(!Array.isArray(config)){
					this.ready = $q.resolve()
					return null					
				}

				let ready = 	Promise.all(config.map( wfConfig => {

									const fontFamily 	= wfConfig.fontFamily
									const consent		= wfConfig.consent
									const consentKey	= 'webfont_' + fontFamily

									if(wfConfig.consent){

										icConsent.add(consentKey, consent.server, consent.default)

										if(this.isAvailable(fontFamily)) 		return 	Promise.resolve('icWebfonts: font already available '	+ fontFamily)

										const consentDeniedMsg = 'icWebfonts: consent denied for ' + fontFamily
											
										if(icConsent.to(consentKey).isDenied)	return 	Promise.resolve(consentDeniedMsg)
										if(icConsent.to(consentKey).isGiven)	return 	this.loadCss(wfConfig.url).then( () => 'icWebfonts: '+fontFamily+' [ok]')


										icConsent.when(consentKey)
										.then(
											() => this.loadCss(wfConfig.url),
											() => console.info(consentDeniedMsg)
										)

										return 	Promise.resolve('icWebfonts: loading deferred until consent is given: ' + fontFamily)

									}

									return 	() => this.loadCss(wfConfig.url)
											

								}))
								.then( (result) => result.forEach( r => console.info(r) ) )

				this.ready = $q.when(ready)
			}

		}

		return new IcWebfonts()

	}

])



.service('icGeo', [

	'$q',
	'ic',
	'icConfig',
	'icConsent',

	function($q, ic, icConfig, icConsent){

		class IcGeo {

			async guess(city, street, postalcode){
				const base		= icConfig.publicApi
				const path		= '/geo-guess'
				const queries	= new URLSearchParams({city, street, postalcode})
				const url		= `${base}${path}?${queries}`
				const response 	= await fetch(url)

				if(!response.ok) throw new Error(`HTTP error! Status: ${response.status}`)

				const data		= response.json()

				return data
			}

		}

		return new IcGeo()
	}

])

.service('icRecurring', [

	'icConfig',
	'icUtils',

	function(icConfig, icUtils){


		// TODO: change startTime to strings, no need for Date objects, right?

		class RecurringRule {


			static availableIterations = ['fixed', 'daily', 'mon-fri', 'weekly', 'bi-weekly', 'three-weekly', 'four-weekly', 'first_of_month', 'second_of_month', 'third_of_month', 'fourth_of_month']

			_iteration	= undefined
			_weekday	= undefined
			startTime	= undefined
			endTime		= undefined

			set iteration(x) {
				if(!RecurringRule.availableIterations.includes(x)) throw new Error(`Unavailable iteration: ${x}`, { cause:x })
				this._iteration = x
			}

			get iteration() {
				return 	RecurringRule.availableIterations.includes(this._iteration)
						?	this._iteration
						:	undefined
			}

			set weekday(x){
				this._weekday = x
			}

			get weekday(){
				return	['fixed', 'daily', 'mon-fri'].includes(this.iteration)
						?	undefined
						:	this._weekday
			}

			get startTimeString(){

				if( !(this.startTime instanceof Date) ) return undefined
				if( isNaN(this.startTime.getTime()) )	return undefined

				return (""+this.startTime.getHours()).padStart(2,'0') + ':' + (""+this.startTime.getMinutes()).padStart(2,'0')
			}

			get endTimeString(){
				if( !(this.endTime instanceof Date) ) 	return undefined
				if( isNaN(this.endTime.getTime()) )		return undefined


				return (""+this.endTime.getHours()).padStart(2, '0') + ':' + (""+this.endTime.getMinutes()).padStart(2,'0')
			}

			get requiresExampleDate(){
				return ['fixed', 'bi-weekly', 'three-weekly', 'four-weekly'].includes(this.iteration)
			}

			get requiresWeekday(){
				return !['fixed', 'daily', 'mon-fri'].includes(this.iteration)
			}


			/**
			 * [iteration, weekday, startTime, endTime, exampleDate]
			 */
			static from(flatRule){

				flatRule 			= 	typeof flatRule === 'string'
											?	JSON.parse(str)
											:	flatRule

				flatRule			=	flatRule || []						

				const params 		= 	{}

				const iteration 	= 	flatRule[0]
				const weekday		= 	flatRule[1]
				const startTime		= 	flatRule[2] && new Date(1970,0,1,...flatRule[2].split(':').map(x => parseInt(x) )) 
				const endTime		= 	flatRule[3] && new Date(1970,0,1,...flatRule[3].split(':').map(x => parseInt(x) ))


				const [YYYY, MM, DD]=	(flatRule[4]||'XXXX-XX-XX').split('-')
				const year			=	parseInt(YYYY)
				const month			=	parseInt(MM)-1
				const day			=	parseInt(DD)
				const date			=	new Date(year, month, day)

				const exampleDate	=	isNaN(date.getTime())
										? 	undefined
										:	date


				return new RecurringRule({iteration, weekday, startTime, endTime, exampleDate})
			}

			constructor({iteration, weekday, startTime, endTime, exampleDate}) {

				this.iteration 		= iteration
				this.weekday		= weekday
				this.startTime		= startTime
				this.endTime		= endTime
				this.exampleDate	= exampleDate

			}


			getErrors() {

				if(!this.iteration) 						return "MISSING_ITERATION"
				if(this.requiresWeekday && !this.weekday)	return "MISSING_WEEKDAY"

				if(!RecurringRule.availableIterations.includes(this.iteration)) return "UNKNOWN_ITERATION"

				if(this.requiresExampleDate){

					if(!this.exampleDate) return "MISSING_EXAMPLE_DATE"

					if(
						! (this.exampleDate instanceof Date) 
						||
						isNaN(this.exampleDate.getTime())

					) return "INVALID_EXAMPLE_DATE"

				}

				if(!this.startTime) 					return "MISSING_START_TIME"
				if(isNaN(this.startTime.getTime() ) ) 	return "INVALID_START_TIME"

			}

			toJSON() {

				const flatRule = [] // [iteration mode, weekday, start time, end time]

				if(this.iteration){

					flatRule[0] 	= 	this.iteration || undefined
					flatRule[1]		=	['daily', 'mon-fri'].includes(this.iteration)
										?	undefined
										:	this.weekday || undefined					

					flatRule[2]		=	this.startTimeString
					flatRule[3]		=	this.endTimeString

					
					flatRule[4] 	= 	this.exampleDate
										?	icUtils.stringifyDate(this.exampleDate)
										:	undefined


				}

				return flatRule					

			}


			getRRule(){
				const freq			=	{
											'daily':			'FREQ=DAILY',
											'weekly': 			'FREQ=WEEKLY',
											'mon-fri':			'FREQ=WEEKLY',
											'bi-weekly':		'FREQ=WEEKLY',
											'three-weekly':		'FREQ=WEEKLY',
											'four-weekly':		'FREQ=WEEKLY',
											'first_of_month':	'FREQ=MONTHLY',
											'second_of_month':	'FREQ=MONTHLY',
											'third_of_month':	'FREQ=MONTHLY',
											'fourth_of_month':	'FREQ=MONTHLY',

										}[this.iteration]

				const interval		=	{
											'daily':			'INTERVAL=1',
											'weekly': 			'INTERVAL=1',
											'mon-fri':			'INTERVAL=1',
											'bi-weekly':		'INTERVAL=2',
											'three-weekly':		'INTERVAL=3',
											'four-weekly':		'INTERVAL=4',
											'first_of_month':	'INTERVAL=1',
											'second_of_month':	'INTERVAL=1',
											'third_of_month':	'INTERVAL=1',
											'fourth_of_month':	'INTERVAL=1',

										}[this.iteration]

				const bysetpos		=	{
											'first_of_month':	'BYSETPOS=1',
											'second_of_month':	'BYSETPOS=2',
											'third_of_month':	'BYSETPOS=3',
											'fourth_of_month':	'BYSETPOS=4',											
										}[this.iteration]

				const day			=	{
											'mon':		'MO',
											'tue':		'TU',
											'wed':		'WE',
											'thu':		'TH',
											'fri':		'FR',
											'sat':		'SA',
											'sun':		'SU',
										}[this.weekday]						

				const byday			=	{
											'daily':		'',
											'weekly': 			`BYDAY=${day}`,
											'mon-fri':			'BYDAY=MO,TU,WE,TH,FR',
											'bi-weekly':		`BYDAY=${day}`,
											'three-weekly':		`BYDAY=${day}`,
											'four-weekly':		`BYDAY=${day}`,
											'first_of_month':	`BYDAY=${day}`,
											'second_of_month':	`BYDAY=${day}`,
											'third_of_month':	`BYDAY=${day}`,
											'fourth_of_month':	`BYDAY=${day}`,

										}[this.iteration]		

				const rrule			=	[freq, bysetpos, interval, byday]
										.filter( x => !!x)					
										.join(';')

				return 	rrule
						?	'RRULE:'+rrule
						:	''
			}


			toVEVENT({title, description, location, startDate, endDate, url} = {}){				

				if(this.getErrors()){
					console.warn('Recurring Rule has Errors!', this)	
					return ""
				} 


				let fakeStartStr 	= undefined

				startDate 			= this.exampleDate || startDate

				if(!startDate){

					const fakeDate = new Date()

					fakeDate.setDate(fakeDate.getDate()-2)	
					
					fakeStartStr	=	icUtils.stringifyDate(fakeDate)
					startDate		=	fakeStartStr

				}

				const startDateStr 	= 	icUtils.stringifyDate(startDate).replaceAll('-', '')

				const startTimeStr 	= 	this.startTimeString
										?	'T'+this.startTimeString.replaceAll(':', '')+'00' 	// assumming HH:mm
										:	''
				const endDateStr	= 	icUtils.stringifyDate(endDate||'').replaceAll('-', '')

				const endTimeStr 	= 	this.endTimeString
										?	'T'+this.endTimeString.replaceAll(':', '')+'00' 	// assumming HH:mm
										:	''


				if(!this.iteration) throw new Error('missing .iteration')

				
				const rrule			=	this.getRRule()

				const exDate		=	fakeStartStr
										?	`EXDATE;TZID=Europe/Berlin:${fakeStartStr.replaceAll('-','')}`
										:	''

				const dtstamp		=	new Date().toISOString().replaceAll(/(\:)|(\-)|(\.\d\d\d)/g,'')

				const uid			=	crypto.randomUUID()

				const dtstart		=	`DTSTART;TZID=Europe/Berlin:${startDateStr}${startTimeStr}`

				const dtend			=	endDateStr
										?	`DTEND;TZID=Europe/Berlin:${endDateStr}${endTimeStr}`
										:	''


				const vEVENT		=	`
											BEGIN:VEVENT
												UID:${uid}
												DTSTAMP:${dtstamp}
												${dtstart}
												${rrule}
												${dtend}
												SUMMARY:${title || ''}
												URL:${url || ''}
												DESCRIPTION;ENCODING=QUOTED-PRINTABLE:${ (description || '').replaceAll(/\n/g, '\\n')}
												LOCATION:${location || ''}
												${exDate}
											END:VEVENT				
										`					
										.replaceAll(/(^\s*)|(\s*$)/gm, '')


				return vEVENT
			}



			match(d = new Date()) {

				const errors	= this.getErrors()

				if(errors) return false

				const date		= new Date(d)

				date.setHours(0)
				date.setMinutes(0)

				const next		= new Date(date)

				next.setDate(date.getDate()+1)

				const rrule 	= this.getRRule()

				const year		= date.getFullYear()
				const month		= (date.getMonth()+1+'').padStart(2, '0')
				const day		= (date.getDate()+'').padStart(2, '0')

				const dtstart 	= `DTSTART:${year}${month}${day}T000000`

				const rule		= `${dtstart};\n${rrule}`

				const isMatch	= RRule.fromString(rule).between(date,next).length != 0
				
				return isMatch
			}

			nextOccurence(d = new Date() ){

				const errors	= this.getErrors()

				if(errors){
					console.log({errors})
					return null
				}

				const date		=	new Date(d)
				const startDate	=	this.exampleDate || date

				const rrule 	= 	this.getRRule()

				const year		= 	startDate.getFullYear()
				const month		= 	(startDate.getMonth()+1+'').padStart(2, '0')
				const day		= 	(startDate.getDate()+'').padStart(2, '0')

				const dtstart 	= 	`DTSTART:${year}${month}${day}T000000`

				const rule		= 	`${dtstart};\n${rrule}`

				const threshold	=	this.exampleDate && (this.exampleDate > date)
									?	this.exampleDate
									:	date

				const nextDate	= 	RRule.fromString(rule).after(threshold, true)
				
				return nextDate || null

			}

		}

		class RecurringRuleset {

			rules	= []

			static from(flatRules){


				flatRules =	typeof flatRules === 'string'
							?	flatRules = JSON.parse(flatRules)
							:	flatRules

				if(!Array.isArray(flatRules)) throw new Error('Unable to parse argument into array of rules.', { cause: s })

				
				return new RecurringRuleset(flatRules)
			}

			constructor(rules) {
				(rules || []).forEach( rule => this.addRule(rule) )
			}

			toJSON() {
				return this.rules
			}

			toString() {
				return JSON.stringify(this.toJSON())
			}

			removeRule(rule){
				const index = this.rules.indexOf(rule)
				this.rules.splice(index,1)
			}

			isOneTime(){

				if(this.rules.length != 1) return false


				const iteration = this.rules[0].iteration

				return iteration === 'fixed'
			} 

			addRule(rule){

				if(! (rule instanceof RecurringRule ) ) rule = RecurringRule.from(rule)

				this.rules.push(rule)
			}

			clear(){
				while(this.rules.length){ this.rules.pop() }
			}

			getMatchingTimes(date = new Date() ){

				return 	this.rules
						.filter(	rule => rule.match(date) )
						.map( 		rule => [ rule.startTime, rule.endTime ] )
			}

			getErrors(){
				return	this.rules
						.map( rule => rule.getErrors() )
						.filter( x => !!x)

			}

			toVCALENDAR({title, description, location, startDate, startTime, endDate, endTime, url} = {}){

				const prodId	=	icConfig.title.toLowerCase().replaceAll(/\W/g,'-')
				const dtstamp	=	new Date().toISOString().replaceAll(/(\:)|(\-)|(\.\d\d\d)/g,'')
				const vEVENTS 	= 	this.rules.map( rule => rule.toVEVENT({title, description, location, startDate, startTime, endDate, endTime, url}) ).join('\n')
				const vCALENDAR	=	`
										BEGIN:VCALENDAR										
											VERSION:2.0											
											PRODID:${prodId}
											DTSTAMP:${dtstamp}
											CALSCALE:GREGORIAN
											BEGIN:VTIMEZONE
												TZID:Europe/Berlin
												BEGIN:DAYLIGHT
													TZNAME:CEST
													TZOFFSETFROM:+0100
													TZOFFSETTO:+0200
													DTSTART:19700329T020000
													RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
												END:DAYLIGHT
												BEGIN:STANDARD
													TZNAME:CET
													TZOFFSETFROM:+0200
													TZOFFSETTO:+0100
													DTSTART:19701025T030000
													RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
												END:STANDARD
											END:VTIMEZONE
											${vEVENTS}
										END:VCALENDAR
									`
									.replaceAll(/(^\s*)|(\s*$)/gm, '')

				return vCALENDAR

			}

		}

		class IcRecurring {

			get availableIterations(){ return RecurringRule.availableIterations }

			createRecurringRuleset(str){
				return RecurringRuleset.from(str||[])
			}



			guessFromTextDe(str){

				function normalizeDate(d){

					let match 
					const germanDate = /(\d\d)\.(\d\d)\.(\d\d\d\d)/

					match = d.match(germanDate)
					
					return `${match[3]}-${match[2]}-${match[1]}`
				}

				function normalizeTime(t){

					if(t.match(/^\d\d:\d\d$/)) 	return t
					if(t.match(/^\d\d$/)) 		return t+':00'
					if(t.match(/^\d$/)) 		return '0'+t+':00'
					if(t.match(/^\d:\d\d$/)) 	return '0'+t

					let match 
					
					match = t.match(/^(\d\d)[\s]*Uhr$/)
					
					if(match) return `${match[1]}:00`

				}	

				function normalizeDayOfWeek(dow){
					return {
						'Montag':		'mon',
						'Dienstag':		'tue',
						'Mittwoch':		'wed',
						'Donnerstag':	'thu',
						'Freitag':		'fri',
						'Samstag':		'sat',
						'Sonntag':		'sun'
					}[dow]
				}


				const isString 		= 	typeof str === 'string'
				const emptyString	= 	isString && str.trim() ===''

				if(!isString || emptyString) return null

				const lines			= 	str
										.split(/(\r|\n)/)
										.map(line => line.trim())
										.filter( line => !!line)



				const preRules 	=  	[]

				lines.forEach( line => {

							const weekdays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']

							let matches

							// Jeden Mittwoch, 18:30 – 20 Uhr
							// Jeden Mittwoch, 15:00 – 17:00 Uhr

							matches = line.match(/^[\s-]*Jeden[\s]*(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag)s?[\,\s\:]*(\d?\d:\d\d|\d?\d)[\s-–]*(\d?\d\:\d\d|\d?\d[\s]*Uhr)/)

							if(matches){

								preRules.push({
									startTime: 	`${normalizeTime(matches[2])}`,
									endTime:	`${normalizeTime(matches[3])}`,
									daysOfWeek:	[normalizeDayOfWeek(matches[1])],
								})
							}

							// Dienstags: 17:30 – 19:30 Uhr
							matches = line.match(/^[\s-]*(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag)s?[\,\s\:]*(\d\d:\d\d|\d?\d)[\s-–]*(\d\d\:\d\d|\d?\d[\s]*Uhr)/)

							if(matches){

								preRules.push({
									startTime: 	`${normalizeTime(matches[2])}`,
									endTime:	`${normalizeTime(matches[3])}`,
									daysOfWeek:	[normalizeDayOfWeek(matches[1])],
								})
							}

							// Freitag: 09:00 – 12:00 Uhr und 13:00 – 17:00 Uhr <-- zweiter Teil	

							matches = line.match(/^[\s-]*(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag)s?[\,\s\:]*.*und\s*(\d\d:\d\d|\d?\d)[\s-–]*(\d\d\:\d\d|\d?\d[\s]*Uhr)/)

							if(matches){

								preRules.push({
									startTime: 	`${normalizeTime(matches[2])}`,
									endTime:	`${normalizeTime(matches[3])}`,
									daysOfWeek:	[normalizeDayOfWeek(matches[1])],
								})
							}

							// Montag – Freitag: 08:00 – 14:00 Uhr	

							matches = line.match(/^[\s-]*(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag)[\s-–bis]*(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag)[\,\s\:]*(\d?\d:\d\d)[\s-–]*(\d?\d\:\d\d|\d\d[\s]*Uhr)/)

							if(matches){


								preRules.push({
									startTime: 	`${normalizeTime(matches[3])}`,
									endTime:	`${normalizeTime(matches[4])}`,
									daysOfWeek:	weekdays
												.slice(weekdays.indexOf(matches[1]), weekdays.indexOf(matches[2])+1)
												.map(normalizeDayOfWeek),
								})
							}

							// Montag, Freitag: 08:00 – 14:00 Uhr	

							matches = line.match(/^[\s-]*(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag)[\s,]*(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag)[\,\s\:]*(\d?\d:\d\d)[\s-–]*(\d?\d\:\d\d|\d\d[\s]*Uhr)/)

							if(matches){


								preRules.push({
									startTime: 	`${normalizeTime(matches[3])}`,
									endTime:	`${normalizeTime(matches[4])}`,
									daysOfWeek:	[normalizeDayOfWeek(matches[1]), normalizeDayOfWeek(matches[2])],
								})
							}

							// Montag, Dienstag, Freitag: 08:00 – 14:00 Uhr	

							matches = line.match(/^[\s-]*(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag)[\s,]*(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag)[\s,]*(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag)[\,\s\:]*(\d?\d:\d\d)[\s-–]*(\d?\d\:\d\d|\d\d[\s]*Uhr)/)

							if(matches){

								preRules.push({
									startTime: 	`${normalizeTime(matches[4])}`,
									endTime:	`${normalizeTime(matches[5])}`,
									daysOfWeek:	[normalizeDayOfWeek(matches[1]), normalizeDayOfWeek(matches[2]), normalizeDayOfWeek(matches[3])],
								})
							}



						})	

						const flatRules	=	 preRules
											.filter(ev=>!!ev)
											.map( ev => (ev.daysOfWeek||[]).map( weekday => ['weekly', weekday, ev.startTime, ev.endTime ]) )
											.flat()
											.map( rule => JSON.stringify(rule))
											.filter( (str,index,arr) => arr.indexOf(str) == index)
											.map( str => JSON.parse(str) )


						return this.createRecurringRuleset(flatRules)

			} 
		
		}

		return new IcRecurring
	}
])



//updating core Service


.run([
	'ic',
	'icInit',
	'icSite',
	'icItemStorage',
	'icLayout',
	'icItemConfig',
	'icTaxonomy',
	'icFilterConfig',
	'icLanguages',
	'icFavourites',
	'icOverlays',
	'icAdmin',
	'icUser',
	'icStats',
	'icConfig',
	'icUtils',
	'icConsent',
	'icTiles',
	'icOptions',
	'icLists',
	'icMainMap',
	'icWebfonts',
	'icItemRef',
	'icKeyboard',	
	'icAutoFill',
	'icExport',
	'icGeo',
	'icRemotePages',
	'icRecurring',
	'icMatomo',
	'$rootScope',

	function(ic, icInit, icSite, icItemStorage, icLayout, icItemConfig, icTaxonomy, icFilterConfig, icLanguages, icFavourites, icOverlays, icAdmin, icUser, icStats, icConfig, icUtils, icConsent, icTiles, icOptions, icLists, icMainMap, icWebfonts, icItemRef, icKeyboard, icAutoFill, icExport, icGeo, icRemotePages, icRecurring, icMatomo, $rootScope ){

		ic.admin		= icAdmin
		ic.autoFill		= icAutoFill
		ic.config		= icConfig
		ic.consent		= icConsent
		ic.favourites	= icFavourites
		ic.filterConfig	= icFilterConfig
		ic.init			= icInit
		ic.itemConfig	= icItemConfig
		ic.itemRef		= icItemRef
		ic.itemStorage 	= icItemStorage
		ic.keyboard		= icKeyboard
		ic.languages	= icLanguages
		ic.layout		= icLayout
		ic.lists		= icLists
		ic.mainMap		= icMainMap
		ic.options		= icOptions
		ic.overlays		= icOverlays
		ic.site			= icSite
		ic.stats		= icStats
		ic.taxonomy		= icTaxonomy
		ic.tiles		= icTiles
		ic.user			= icUser
		ic.utils		= icUtils
		ic.webfonts		= icWebfonts
		ic.export		= icExport
		ic.geo			= icGeo
		ic.remotePages	= icRemotePages
		ic.recurring	= icRecurring
		ic.matomo		= icMatomo

		var stop 		= 	$rootScope.$watch(function(){
								if(icInit.ready){
									ic.deferred.resolve()	
									delete ic.deferred

									window.dispatchEvent(new CustomEvent('ic-ready', {detail:{ic}} ) )

									stop()
								} 
							})

		window.icServices = ic

	}
])



