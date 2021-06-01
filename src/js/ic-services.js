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
			}

		}

		return icUtils
	}

])


.service('icInit', [

	'$q',
	'ic',
	'icUser',
	'icItemStorage',
	'icLists',
	'icLanguages',
	'icTiles',
	'icMainMap',
	'icUtils',
	'icWebfonts',
	'icConsent',
	'plImages',
	'plStyles',
	'plTemplates',
	'$timeout',
	'$rootScope', 

	function($q, ic, icUser, icItemStorage, icLists, icLanguages, icTiles, icMainMap, icUtils, icWebfonts, icConsent, plImages, plStyles, plTemplates, $timeout, $rootScope){

		var icInit 			= 	{},
			promises 		= 	{
									icUser: 			icUser.ready,
									icItemStorage:		icItemStorage.ready,
									icTiles:			icTiles.ready,
									icLanguages:		icLanguages.ready,
									icLists:			icLists.ready,
									icWebfonts:			icWebfonts.ready,
									icMainMap:			icMainMap.markersReady,
									plImages:			plImages.ready,
									plStyles:			plStyles.ready,
									plTemplates:		plTemplates.ready,

								}
	

		icInit.ready		= undefined
		icInit.done			= undefined
		icInit.readyCount 	= 0
		icInit.readyMax		= Object.keys(promises).length
		icInit.errors 		= []
	
		Object.defineProperty(icInit, 'progress', {
			get: 	() => { 

						const i = icInit.readyCount
						const n = icInit.readyMax

						return i/n
					}	
		})

		Object.entries(promises).forEach( ([key, promise]) => 
			promise.then(

				function(){
					icInit.readyCount ++

					console.info( (key+'...').padEnd(25,' ')+'[ok]')

					icInit[key] = true

					if(icInit.readyCount == icInit.readyMax){

						icInit.ready = true; 

						//icInit done is used by the loading screen, i.e. it gets removed when icInit.done == true
						$q.when(icUtils.waitWhileBusy(20))
						.then( () => icConsent.ready)
						.then( () => icInit.done = true )
					}
				},
				
				function(e){
					console.error(e)
					console.info( (key+'...').padEnd(25,' ')+'[failed]')
					icInit.errors.push(key)
				}
			)
		)


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

		class icConsent{

			
			cases 				= []
			defer				= $q.defer()
			ready				= this.defer.promise
			promises			= new Set()

			constructor(){
			}


			add(key, server, default_value){

				this.cases.push({key, server, default: default_value})

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

.service('icLists', [

	'$rootScope',
	'$q',
	'$translationCache',
	'icUser',
	'icItemStorage',
	'icLanguages',
	'icTaxonomy',
	'icConfig',

	function($rootScope, $q, $translationCache, icUser, icItemStorage, icLanguages, icTaxonomy, icConfig){

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
			
			console.log('UPDATE LIST')

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

							icLanguages.refreshTranslations(lang)
						})
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

				return path
			}


			icSite.updateFromPath = function(e,n,o){

				path2Params($location.path())

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


			function search2Switches(){
				var binary_str 	= parseInt($location.search().s || 0, 36).toString(2),
					length		= binary_str.length

				icSite.config.switches.forEach(function(swt){
					icSite[swt.name] = !!parseInt(binary_str[length-swt.index-1])

				})


			}

			function switches2Search(){
				if(!icSite.config.switches.length) return null

				var length = 1 + icSite.config.switches.reduce(function(max, swt){ return Math.max(max, swt.index) },0 ),
					arr = Array(length).fill(0),
					s	= '0'

				icSite.config.switches.forEach(function(swt){
					arr[length-swt.index-1] = icSite[swt.name] ? 1 : 0
				})

				s = parseInt(arr.join('') , 2).toString(36)

				return 	s == '0'
						?	null
						:	s
			}


			icSite.updateSearch = function(){
				var current_s 	= $location.search().s,
					new_s		= switches2Search()
				
				if(current_s != new_s) $location.search('s', new_s)

				return icSite
			}

			icSite.updateFromSearch = function(){
				search2Switches()
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
				console.log('print')
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
				ic.ready.then(icSite.updateFromPath)
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
								return icOverlays.open('popup', 'INTERFACE.TRANSLATION_UPDATED')
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
												return 	$q.when(icItemStorage.downloadAll( icUser.can('edit_items') || icConfig.publicItems || undefined))
											})
											.then(function(){
												return icItemStorage.updateFilteredList()
											})

			icItemStorage.newItem = function(){
				var num = 0

				while(icItemStorage.data.some(function(item){ return item.id == 'new_'+num })){	num++ }

				var item = icItemStorage.storeItem({
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



.provider('icTaxonomy',function(){

	var taxonomy	= undefined
		

	function IcCategory(config){
		this.name 	= config.name
		//make sure no tags appear twice
		this.tags	= config.tags.filter(function(v, i, s) { return s.indexOf(v) === i } )
	}

	function IcType(config){
		this.name	= config.name
	}

	this.setTaxonomy	= function(tx){ taxonomy 	= tx; return this}

	this.$get = [
		function(){
			var icTaxonomy = this

			icTaxonomy.categories 	= []
			icTaxonomy.types		= []
			icTaxonomy.tags 		= taxonomy.tags
			icTaxonomy.lor			= taxonomy.lor || []
			icTaxonomy.extraTags	= []

			if(!taxonomy) 	console.error('icTaxonomy: taxonomy missing. You should probably load taxonomy.js.')


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
			

			icTaxonomy.getCategory = function(haystack){


				if(!haystack) return null

				haystack = 	haystack.filter
							?	haystack
							:	[haystack]
				
				haystack = haystack.filter(function(t){ return !!t})

				var result = 	icTaxonomy.categories.filter(function(category){
									return 	haystack.some(function(c){
												return 	(c.name || c) == category.name
											})
								})

				if(!result.length){
					// this is only relevant if the tags are incoherent (if a subcategory exists without category)
					result = 	icTaxonomy.categories.filter(function(category){
									return 	haystack.some(function(c){
												return 	category.tags.indexOf((c.name || c)) != -1
											})
								})
				}


				return	result[0]
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


			icTaxonomy.isUnsortedTag = function(tag){
				return 	Object.values(icTaxonomy.tags)
						.flat()
						.includes(tag)
			}

			icTaxonomy.getTagKind = function(tag){
				if(icTaxonomy.isType(tag)) 			return 'types'
				if(icTaxonomy.isCategory(tag)) 		return 'categories'
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


.service('icFilterConfig',[

	'$rootScope',
	'icSite',
	'icItemStorage',
	'icTaxonomy',
	'icLanguages',
	'icItemConfig',

	function($rootScope, icSite, icItemStorage, icTaxonomy, icLanguages, icItemConfig){
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
								var j = value && value.join && value.join('-')								

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
									result.push.apply(result, category.tags)
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


		icFilterConfig.toggleCategory = function(category_name, toggle, replace){

			var pos 	= 	icSite.filterByCategory.indexOf(category_name),
				toggle 	= 	toggle === undefined
							?	pos == -1
							:	!!toggle

			if(replace) icFilterConfig.clearCategory()

			if(pos == -1 &&  toggle) 				return !!icSite.filterByCategory.push(category_name)
			if(pos != -1 && !toggle && !replace) 	return !!icSite.filterByCategory.splice(pos,1)
		}

		icFilterConfig.clearCategory = function(){
			while(icSite.filterByCategory.pop());
			return icFilterConfig
		}

		icFilterConfig.categoryActive = function(category_name){
			return icSite.filterByCategory.indexOf(category_name) != -1
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
			

			return icFilterConfig
		}

		icFilterConfig.toggleSortDirection = function(dir){
			icSite.sortDirection = dir || (icSite.sortDirection *-1)
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


		$rootScope.$watch(
			function(){
				return 	[
							icItemStorage.getSearchTag(icSite.searchTerm),
							icSite.filterByType,
							icSite.filterByCategory,
							icSite.filterByUnsortedTag
						]
			},
			function(arr){
				icItemStorage.ready.then(function(){
					icItemStorage.updateFilteredList(arr, [
						null, 
						icTaxonomy.types.map(function(type){ return type.name }), 
						icTaxonomy.categories.map(function(category){ return category.name }), 
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
							icSite.sortDirection
						]
			},

			function(){
				icItemStorage.ready
				.then(function(){
					if(icSite.sortOrder)  icItemStorage.sortFilteredList(icSite.sortOrder, icSite.sortDirection)
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





.provider('icLanguages', function(){

	var translationTableUrl = '',
		availableLanguages	= [],
		fallbackLanguage	= undefined

	this.setAvailableLanguages = function(languages){
		Array.prototype.push.apply(availableLanguages, languages)
		return this
	}

	this.setTranslationTableUrl = function(url){
		translationTableUrl = url
		return this
	}

	this.setFallbackLanguage = function(lang){
		fallbackLanguage = lang
	}


	this.$get = [

		'$window',
		'$rootScope',
		'$q',
		'$http',
		'$translate',
		'icSite',
		'onScreenFilter',

		function($window, $rootScope, $q, $http, $translate, icSite, onScreenFilter){

			var icLanguages 			= 	this

			icLanguages.availableLanguages	=	availableLanguages

			icLanguages.fallbackLanguage	= 	fallbackLanguage

			icLanguages.translationTable	=	{}

			icLanguages.ready = 	$http.get(translationTableUrl)
									.then(
										function(result){
											return icLanguages.translationTable = objectKeysToUpperCase(result.data)
										},
										function(){
											return $q.reject("Unable to load language data.")
										}
									)


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

			icSite.registerParameter({
				name: 			'currentLanguage',
				encode:			function(value,ic){
									if(!value) return ''
									return 'l/'+value 
								},

				decode:			function(path,ic){
									var matches 	=	 path.match(/(^|\/)l\/([^\/]*)/),
										best_guess 	= 	(matches && matches[2])
														|| 	ic.site.currentLanguage 
														|| 	icLanguages.getStoredLanguage()
														|| 	(navigator.language && navigator.language.substr(0,2) )
														|| 	(navigator.userLanguage && navigator.userLanguage.substr(0,2) )
														|| 	icLanguages.fallbackLanguage

									return 	( (icLanguages.availableLanguages.indexOf(best_guess) != -1) && best_guess)
											|| 	icLanguages.availableLanguages[0] || 'en'
								},
				defaultValue:	icLanguages.availableLanguages[0] || 'en'

			})


			$rootScope.$watch(
				function(){ return icSite.currentLanguage }, 
				function(){

					if(!icSite.currentLanguage) return null

					$translate.use(icSite.currentLanguage)
					$window.localStorage.setItem('language',icSite.currentLanguage)
				}
			)


			return	icLanguages
		}
	]
})



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

		icOverlays.open = function(overlay_name, message, deferred, overwrite_messages){
			icOverlays.messages[overlay_name] = overwrite_messages
												? 	[]
												:	(icOverlays.messages[overlay_name] || [])

			if(icOverlays.messages[overlay_name].indexOf(message) == -1) icOverlays.messages[overlay_name].push(message)

			if(icOverlays.deferred[overlay_name] && icOverlays.deferred[overlay_name] != deferred) 
				icOverlays.deferred[overlay_name].reject()

			icOverlays.deferred[overlay_name] = deferred || $q.defer()
			

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





.service('icTiles', [

	'$q',

	function($q){

		var icTiles 	= 	[]
			
		if(!dpd.tiles){
			console.error('icTiles: missing dpd.tiles')
			icTiles.ready = $q.resolve()
		}

		icTiles.setup = function(){
			return 	$q.when(dpd.tiles.get())
					.then(function(tiles){
						if(!tiles.length) console.warn('icTiles: no tiles defined.')
						Array().push.apply(icTiles, tiles)
					})
			
		}

		icTiles.ready = dpd.tiles
						?	icTiles.setup()
						:	$q.resolve()

		return 	icTiles
				

	}
])



.service('icWebfonts', [

	'$q',
	'ic',
	'icConfig',
	'icConsent',

	function($q, ic, icConfig, icConsent){

		class icWebfonts {

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

				const config = icConfig.webfonts || []

				if(!Array.isArray(config)) return null

				let ready = Promise.all(config.map( wfConfig => {

					const fontFamily 	= wfConfig.fontFamily
					const consent		= wfConfig.consent
					const consentKey	= 'webfont_' + fontFamily

					if(wfConfig.consent){

						icConsent.add(consentKey, consent.server, consent.default)

						if(this.isAvailable(fontFamily)) 		return 	Promise.resolve('icWebfonts: font already available '	+ fontFamily)

						const consentDeniedMsg = 'icWebfonts: consent denied for ' + fontFamily
							
						if(icConsent.to(consentKey).isDenied)	return 	Promise.resolve(consentDeniedMsg)
						if(icConsent.to(consentKey).isGiven)	return 	this.loadCss(wfConfig.url)


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

			//ic.ready.then(icWebfonts.setup() )

		}

		return new icWebfonts()

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
	'icLists',
	'icMainMap',
	'icWebfonts',
	'$rootScope',

	function(ic, icInit, icSite, icItemStorage, icLayout, icItemConfig, icTaxonomy, icFilterConfig, icLanguages, icFavourites, icOverlays, icAdmin, icUser, icStats, icConfig, icUtils, icConsent, icTiles, icLists, icMainMap, icWebfonts, $rootScope, ){

		ic.init			= icInit
		ic.site			= icSite
		ic.itemStorage 	= icItemStorage
		ic.layout		= icLayout
		ic.itemConfig	= icItemConfig
		ic.taxonomy		= icTaxonomy
		ic.filterConfig	= icFilterConfig
		ic.languages	= icLanguages
		ic.favourites	= icFavourites
		ic.overlays		= icOverlays
		ic.admin		= icAdmin
		ic.user			= icUser
		ic.stats		= icStats
		ic.config		= icConfig
		ic.utils		= icUtils
		ic.consent		= icConsent
		ic.mainMap		= icMainMap
		ic.tiles		= icTiles
		ic.lists		= icLists
		ic.webfonts		= icWebfonts

		var stop 		= 	$rootScope.$watch(function(){
								if(icInit.ready){
									ic.deferred.resolve()	
									delete ic.deferred

									window.dispatchEvent(new CustomEvent('ic-ready', {detail:{ic}} ) )

									stop()
								} 
							})

	}
])



