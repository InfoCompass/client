"use strict";

(async function(){


	async function setupServiceWorker(){

		const registration = await navigator.serviceWorker.register("/ic-service-worker.js")
		console.info("Service worker registered.")
		
		const swUpdateItems = async () => {
			const registration = await navigator.serviceWorker.ready
			if(!registration || ! registration.active) return
			registration.active.postMessage('update-items')
		}			
		
		window.addEventListener("beforeunload",	swUpdateItems)
		window.addEventListener("blur", 		swUpdateItems)
		window.addEventListener("online", 		swUpdateItems)
	}


	try{
		await setupServiceWorker()		
	} catch(cause) {
		console.error(new Error('Failed to register service worker.', { cause }))
	}


	async function setupMappoClient(){
		if(!icConfig.mappo) {
			// if not configured everything is fine...
			console.info("Mappo client not configured.")
			return 
		}
		if(!mappo)	throw new Error("Missing MappoClient package.")

		const IndexedDbStorage 	= 	mappo.IndexedDbStorage
		const NaiveMappoDiffer	= 	mappo.NaiveMappoDiffer
		const MappoClient 		= 	mappo.MappoClient

		window.mappoClient 		= 	new MappoClient({
										backendUrl:	icConfig.mappo,
										storage: 	new IndexedDbStorage('Mappo-Aggregato'),
										differ:		new NaiveMappoDiffer(),
									})

		console.info("MappoClient enabled.")	
	}

	
	try{
		await setupMappoClient()
	} catch(cause){
		console.error(new Error('Failed to setup MappoClient.', { cause }))
	}

	// function loadJSON(filename) {   
		
	// 	return new Promise(function(resolve, reject){

	// 		var xobj = new XMLHttpRequest()
	// 			xobj.overrideMimeType("application/json")

	// 		xobj.open('GET', filename, true)
	// 		xobj.onreadystatechange = function () {
	// 			if (xobj.readyState == 4 && xobj.status == "200") {
	// 				resolve(JSON.parse(xobj.responseText))
	// 			}
	// 		};
	// 		xobj.send(null);  

	// 	})


	//  }

	 // function getBuildNumber(){
	 // 	return new Promise(function(resolve, reject){

	// 		var xobj = new XMLHttpRequest()
	// 			xobj.overrideMimeType("application/text")

	// 		xobj.open('GET', 'build', true)
	// 		xobj.onreadystatechange = function () {
	// 			if (xobj.readyState == 4 && xobj.status == "200") {
	// 				resolve(xobj.responseText)
	// 			}
	// 		};
	// 		xobj.send(null);  

	// 	})

	 // }
	

	if(!build) throw new Error("Missing build number!") // build should be a global variable added by build script.

	console.info(`Build: ${build}`)	

	angular.module("InfoCompass",[
		'monospaced.qrcode',
		'ngSanitize',
		'icLayout',
		'icServices',
		'icDirectives',
		'icFilters',
		'icUiDirectives',	
		'icMap',
		'icPreload',
	])
	.constant('icConfig', icConfig) // icConfig should be a global variable added by build script.


	.config(['$compileProvider', function ($compileProvider) {
		$compileProvider.debugInfoEnabled(false)
	}])


	.config([

		'$locationProvider',

		function($locationProvider){
			$locationProvider
			.html5Mode({
				enabled:		true
			})
		}
			
	])

	.config([

		'plImagesProvider',

		function(plImagesProvider){
			plImagesProvider.setJsonFile('preload-images_'+build+'.json') 
		}
	])

	.config([

		'plStylesProvider',

		function(plStylesProvider){
			plStylesProvider.setFiles([
				'/styles_'+build+'/styles.css',
				icConfig.externalCss
			])
		}
	])
		

	.config([

		'plTemplatesProvider',

		function(plTemplatesProvider){
			plTemplatesProvider.setJsonFile('preload-templates_'+build+'.json')
		}
	])

	.config([

		'icStatsProvider',

		function(icStatsProvider){
			icStatsProvider.setUrl(icConfig.statsLocation)
		}
	])

	.config([
		'icMainMapProvider',

		function(icMainMapProvider){
			if(icConfig.map) icMainMapProvider.setDefaults(icConfig.map)
		}
	])


	.config([

		'icSiteProvider',

		function(icSiteProvider){
			icSiteProvider
			.registerParameter({
				name: 			'list',
				encode:			function(value, ic){
									return 	value 
											?	'list' 
											:	''
								},
				decode:			function(path, ic){
									var matches = path.match(/(^|\/)list(\/|$)/)

									return !!matches
								}
			})

			.registerParameter({
				name: 			'activeItem',
				encode:			function(value, ic){

									return 	value && value.id
											?	'item/'+value.id 
											:	''
								},
				decode:			function(path, ic){
									var matches = path.match(/(^|\/)item\/([^\/]*)()/)

									if(matches && matches[2] && matches[2] == 'new') 	return ic.itemStorage.newItem(matches[2])

									return	matches && matches[2]
											?	ic.itemStorage.getItem(matches[2], true)
											:	null
								}
			})

			.registerParameter({
				name: 			'page',
				encode:			function(value, ic){
									if(!value) return ''
									return 'p/'+value 
								},
				decode:			function(path, ic){
									var matches = path.match(/(^|\/)p\/([^\/]*)/)

									return matches && matches[2]
								},
				adjust:			function(ic){

									if(		
											(icConfig.adminPages||[]).includes(ic.site.page) 
										&& 	!ic.user.can('edit_items')

									)  								return this.defaultValue

									if(ic.site.activeItem)			return this.defaultValue
									if(ic.site.list)				return this.defaultValue
									if(ic.site.calendar)			return this.defaultValue
					

									return ic.site.page
								},
				options:		[...icConfig.pages||[], ...icConfig.adminPages||[], 'home'],
				defaultValue:	'home'
			})



			.registerSection({
				name:			'page',
				template:		'partials/ic-section-page.html',
				active:			function(ic){									
									return ic.site.page && !ic.site.list && !ic.site.activeItem && !ic.site.calendar
								},
				show:			function(ic){

									if(ic.site.pickCoordinates){
										if(ic.layout.mode.name == 'XS')		return false
										if(ic.layout.mode.name == 'S')		return false
										if(ic.layout.mode.name == 'M')		return false
										if(ic.layout.mode.name == 'L')		return false
									}



									if(ic.site.activeSections.item) return false						
									if(ic.site.activeSections.list) return false						
									if(ic.site.expandMap)			return false

									return true
								},

			})
			.registerSection({
				name:			'filter',
				template:		'partials/ic-section-filter.html',
				active:			function(ic){
									return 		ic.site.list 
											||	(ic.site.expandMap && !ic.site.editItem)
											||	ic.site.calendar
								},

				show:			function(ic){		

									if(ic.site.pickCoordinates){
										if(ic.layout.mode.name == 'XS')		return false
										if(ic.layout.mode.name == 'S')		return false
										if(ic.layout.mode.name == 'M')		return false
										if(ic.layout.mode.name == 'L')		return false
									}


									if(ic.layout.mode.name == 'XS') 	return false
									if(ic.layout.mode.name == 'S')		return ic.site.activeSections.item ? false : true
									if(ic.layout.mode.name == 'M')		return ic.site.activeSections.item ? false : true
									if(ic.layout.mode.name == 'L')		return ic.site.activeSections.item ? false : true

									return 	true
								},

				tabgroup:		true				
			})

			.registerSection({
				name:			'list',
				template:		'partials/ic-section-list.html',
				active:			function(ic){
									return 	ic.site.list
								},

				show:			function(ic){		

									if(ic.site.pickCoordinates){
										if(ic.layout.mode.name == 'XS')		return false
										if(ic.layout.mode.name == 'S')		return false
										if(ic.layout.mode.name == 'M')		return false
										if(ic.layout.mode.name == 'L')		return false
									}


									if(ic.site.expandMap) 				return false		
									if(ic.layout.mode.name == 'XS') 	return 	ic.site.activeSections.item ? false : true
									if(ic.layout.mode.name == 'S') 		return 	ic.site.activeSections.item ? false : true

									if(ic.site.activeSections.calendar)	return false
											

									return 	true
								},

				tabgroup:		true				
			})

			.registerSection({
				name:			'item',
				template:		'partials/ic-section-item.html',
				active:			function(ic){
									return 	!!ic.site.activeItem
								},
				show:			function(ic){


									if(ic.site.pickCoordinates){
										if(ic.layout.mode.name == 'XS')		return false
										if(ic.layout.mode.name == 'S')		return false
									}

									if(ic.site.expandMap) 				return ic.layout.mode.name == 'XL'	

										
									return true
								},				
			})
			.registerSection({
				name:			'map',
				template:		'partials/ic-section-map.html',
				active:			function(ic){
									return 	true
								},
				show:			function(ic){

									if(ic.site.pickCoordinates)			return true

									if(ic.site.expandMap)				return true

									if(ic.layout.mode.name == 'XS')		return false
									if(ic.layout.mode.name == 'S')		return !ic.site.activeSections.page &&  !ic.site.activeSections.item && !ic.site.activeSections.calendar
									if(ic.layout.mode.name == 'M')		return !ic.site.activeSections.page &&  !ic.site.activeSections.item
									if(ic.layout.mode.name == 'L')		return !ic.site.activeSections.page &&  !(ic.site.activeSections.item && (ic.site.activeSections.list || ic.site.activeSections.calendar))
									if(ic.layout.mode.name == 'XL')		return !ic.site.activeSections.page &&  !(ic.site.activeSections.item && (ic.site.activeSections.list || ic.site.activeSections.calendar))

									return	true
								}				
			})
			
			.registerSwitch({
				name:			'expandMap',
				index:			0,
				adjust:			function(ic){
									return ic.site.expandMap && !(ic.site.activeItem && ic.site.activeItem.internal.failed)
								}
			})		

			.registerSwitch({
				name:			'editItem',
				index:			1,
				adjust:			function(ic){
									if(!ic.site.activeItem) 				return false
									if(ic.site.activeItem.remoteItem)		return false
									if(ic.site.activeItem.internal.new)		return true
									if(ic.site.activeItem.internal.failed)	return false
									
									return ic.site.editItem
								}
			})

			.registerSwitch({
				name:			'pickCoordinates',
				index:			2,					
			})


			if(icConfig.calendar){

				icSiteProvider
				.registerParameter({
					name: 			'calendar',
					encode:			function(value, ic){
										return 	value 
												?	'calendar' 
												:	''
									},
					decode:			function(path, ic){
										var matches = path.match(/(^|\/)calendar(\/|$)/)

										return !!matches
									}
				})
				.registerSection({
					name:			'calendar',
					template:		'partials/ic-section-calendar.html',
					active:			function(ic){
										return 	ic.site.calendar
									},

					show:			function(ic){													

										if(ic.site.pickCoordinates){
											if(ic.layout.mode.name == 'XS')		return false
											if(ic.layout.mode.name == 'S')		return false
											if(ic.layout.mode.name == 'M')		return false
											if(ic.layout.mode.name == 'L')		return false
										}


										if(ic.site.expandMap) 				return false		
										if(ic.layout.mode.name == 'XS') 	return 	ic.site.activeSections.item ? false : true
										if(ic.layout.mode.name == 'S') 		return 	ic.site.activeSections.item ? false : true


										return 	true
									},	
				})

			}

		}
	])


	.config([

		'$compileProvider',

		function($compileProvider){
			$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|whatsapp|mailto|tel|tg):/)
		}
	])


	.config([

		'icItemStorageProvider',

		function(icItemStorageProvider){
			if(!(window.ic && window.ic.itemStorage)) 
					console.error('icItemStorageProvider:  missing ic.itemStorage. Please load dpd-item-storage.js.')

			icItemStorageProvider.setItemStorage(window.ic.itemStorage)
		}
	])

	.config([
		'$translateProvider',

		function($translateProvider){
			$translateProvider.useLoader('icInterfaceTranslationLoader')
			$translateProvider.useSanitizeValueStrategy('sanitizeParameters')
			$translateProvider.preferredLanguage('de')
		}
	])



	.config([

		'icTaxonomyProvider',

		function(icTaxonomyProvider){

			// if(!(window.ic && window.ic.itemConfig)) 
			// 	console.error('icTaxonomyProvider:  missing ic.itemConfig. Please load ic-item-config.js.')
			if(!(window.ic && window.ic.taxonomy)) 
				console.error('icTaxonomyProvider:  missing ic.taxonomy. Please load taxonomy.js.')

			icTaxonomyProvider
			//.setItemConfig(window.ic.itemConfig)
			.setTaxonomy(window.ic.taxonomy)
		}
	])

	.config([

		'icItemConfigProvider',

		function(icItemConfigProvider){

			if(!(window.ic && window.ic.itemConfig)) 
				console.error('icTaxonomyProvider:  missing ic.itemConfig. Please load ic-item-config.js.')
			
			icItemConfigProvider
			.setItemConfig(window.ic.itemConfig)
		}
	])


	.config([

		'icLayoutProvider',

		function(icLayoutProvider){
			icLayoutProvider.setModes([			
				{
					name:		'XS',	
					width: 		24,
					stretch:	true,
				},	
				{
					name:		'S',
					width:		48,
					stretch:	false,
				},
				{
					name:		'M',
					width:		72,
					stretch:	false,
				},
				{
					name:		'L',
					width:		96,
					stretch:	false,
				},
				{
					name:		'XL',
					width:		120,
					stretch:	false,
				}
			])
		}

	])

	.run([
		'$rootScope',
		'$location',
		'ic',

		function($rootScope, $location, ic){

			$rootScope.ic = ic


			// $rootScope.$watch(function(){
			// }, function(x){console.log(x)})

		}
	])
	

	angular.bootstrap(
		document, 
		['InfoCompass'],
		{
			strictDi: true
		}
	)

})()
