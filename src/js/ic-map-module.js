"use strict";


(function(){

	function hasValidGeoCoordinates(item){
		return 		item.latitude
				&&	item.longitude
				&&	typeof item.latitude 		== 'number'
				&&	typeof item.longitude		== 'number'
				&&  Math.abs(item.latitude) 	<= 90
				&&  Math.abs(item.longitude)	<= 180
	}


	function adjustSize(map, step){

		map.invalidateSize(false)

		step = 	typeof step == 'number'
				? step
				: 0

		if(step < 4 ) setTimeout( function(){ adjustSize(map, step+1) }, 100*Math.pow(step+1,2) )
	}



	angular.module('icMap', [
		'icServices',
	])


	.service('icMapMarkerDigestQueue',[

		function(){

			var queuePromise 	= Promise.resolve(),
				chunk_size		= 10,
				points			= chunk_size,
				length			= 0,
				c_resolve
			
			var Queue = {}

			renew()

			function resetPoints(){
				 points = chunk_size
			} 

			function renew(){
				Queue.currentRun = new Promise(function(resolve){
					c_resolve = resolve	
				})

			}

			function advance(scope, weight){
				scope.queuedForDigest = false

				length-- 
				if(scope.$$destroyed) return null

				scope.$digest()
				points -= weight

				if(points <= 0){
					resetPoints()
					return 	new Promise(window.requestAnimationFrame)	
				} 

			}


			function checkForRunEnd(){
				if(length > 0) return null

				c_resolve()

				return 	new Promise(window.requestAnimationFrame)
						
			}


			Queue.isRunning = function(){ return length != 0}

			Queue.add = function(scope, weight){

				if(scope.queuedForDigest) return null

				if(length == 0){
					renew()
					queuePromise = new Promise(window.requestAnimationFrame)
				}

				length++
				if(weight == undefined) weight = 1

				scope.queuedForDigest = true

				queuePromise = 	queuePromise
								.then(advance.bind(null, scope, weight))
								.then(checkForRunEnd)

				return Queue.currentRun
			}

			return Queue
		}

	])


	.service('icMapItemMarker',[

		'$compile',

		function($compile){

			var icMapItemMarker = function(item, parentScope){

				var scope 	=  	parentScope.$new()

				scope.item 	= 	item

				var element = 	$compile('<ic-map-item-marker ic-item = "item"></ic-map-item-marker')(scope)
					//shadow	=	angular.element('<div class = "ic-map-marker-shadow"></div>')

				element[0].style.setProperty("--animation-delay", Math.floor(Math.random()*200 +100)+'ms' )
				element[0].style.setProperty("--animation-duration", Math.floor(Math.random()*100+200)+'ms' )

				this.createIcon = function(){
					return element[0]
				}

				this.createShadow = function(){
					return null // shadow[0]
				}

				this.options = {}
			}

			return icMapItemMarker
		}
	])



	.directive('icMapItemMarker',[

		'$templateCache',
		'ic',

		function($templateCache, ic){
			return {
				restrict:		'AE',
				//templateUrl:	'partials/ic-map-marker-item.html',
				//not using templateUrl, because it triggers a $digest
				template:		$templateCache.get('partials/ic-map-marker-item.html'),
				scope:			{
									icItem:		"<",
									icTitle: 	"<",
									icDetails:	"<",
									icAction:	"&?"
								},

				link: function(scope, element){
					scope.ic = ic
				}

			}
		}

	])


	.service('icMapClusterMarker',[

		'$compile',
		'icMainMap',
		'icMapMarkerDigestQueue',

		function($compile, icMainMap, icMapMarkerDigestQueue){


			function icClusterMarker(cluster){

				if(cluster._marker){
					icMapMarkerDigestQueue.add(cluster.scope, cluster._childCount)
					return cluster._marker
				}

				var scope 	=  	icMainMap.scope.$new(),
					element =	$compile('<ic-map-cluster-marker ic-cluster = "cluster"></ic-map-cluster-marker>')(scope)

				icMapMarkerDigestQueue.add(scope, cluster._childCount)

				scope.cluster 			=	cluster
				cluster.scope 			= 	scope
				cluster._marker 		= 	this
				element[0].scope		= 	scope
				
				element[0].style.setProperty("--animation-delay", Math.floor(Math.random()*250 + 100)+'ms' )
				element[0].style.setProperty("--animation-duration", Math.floor(Math.random()*150 + 250)+'ms' )

				this.createIcon = function(){
					return cluster._icon || element[0]
				}

				this.createShadow = function(){
					return null //shadow[0]
				}

			}

			return icClusterMarker
		}
	])

	.directive('icMapClusterMarker',[

		'$templateCache',
		'icSite',
		'ic',

		function($templateCache, icSite, ic){
			return {
				restrict:		'AE',
				//templateUrl:	'partials/ic-map-marker-cluster.html',
				//not using templateUrl, because it triggers a $digest
				template:		$templateCache.get('partials/ic-map-marker-cluster.html'),
				scope:			{
									icCluster:	"<"
								},

				link: function(scope){

					scope.ic = ic

					scope.$watchCollection('icCluster', function(){

						scope.items = 	scope.icCluster.getAllChildMarkers()
										.map(function(marker){
											return marker.options.item
										})


						scope.isActive = function(item){
							return 	item == icSite.activeItem
									?	0
									:	1
						}
					})
					
				}

			}
		}

	])


	.service('icMapSpinnerControl', [

		'$compile',

		function($compile){

			if(!window.L) console.error('icMapSpinnerControl: missing Leaflet!')

			var element = undefined

			L.Control.icMapSpinnerControl = L.Control.extend({

				onAdd: function(map) {
					return element && element[0]
				},

				onRemove: function(map) {

				}
			})

			this.setScope = function(scope){
				this.scope = scope
				element = 	$compile('<ic-spinner active = "loading"></ic-spinner>')(scope)
			}
		}
	])


	.directive('icMapConsentReminder',[

		'icMainMap',
		'icConsent',

		function(icMainMap, icConsent){
			return {
				restrict : 		'E',
				templateUrl: 	'partials/ic-map-consent-reminder.html',

				link: function(scope){

					scope.confirmConsent = function(){
						icConsent.set(icMainMap.consent.key, true)
					}

					scope.consent		= icMainMap.consent
					scope.consentKey 	= icMainMap.consent && icMainMap.consent.key
					scope.consentCase 	= icMainMap.consent && icConsent.cases.find( consent_case => consent_case.key == scope.consentKey)
				}
			}
		}
	])

	.service('icMapExpandControl', [

		'$compile',

		function($compile){

			if(!window.L){ console.error('icMapExpandControl: missing Leaflet!'); return null}

			var element = undefined


			L.Control.IcMapExpand = L.Control.extend({
				onAdd: function(map) {
					return element && element[0]
				},

				onRemove: function(map) {
				}
			})

			this.setScope = function(scope){
				element = 	$compile('<ic-map-expand-control></ic-map-expand-control>')(scope)
			}
		}
	])

	.directive('icMapExpandControl',[
		function(){
			return {
				restrict : 		'E',
				templateUrl: 	'partials/ic-map-expand-control.html',

				link: function(scope){
				}
			}
		}
	])

	.service('icMapCoordinatePickerControl', [

		'$compile',
		'icMainMap',

		function($compile, icMainMap){

			if(!window.L){ console.error('icMapCoordinatePickerControl: missing Leaflet!'); return null}

			var element = undefined

			L.Control.IcMapCoordinatePicker = L.Control.extend({
				onAdd: function(map) {
					return element && element[0]
				},

				onRemove: function(map) {
				}
			})

			this.setScope = function(scope){
				element = 	$compile('<ic-map-coordinate-picker-control></ic-map-coordinate-picker-control>')(scope)
			}
		}
	])

	.directive('icMapCoordinatePickerControl',[
		
		'icMainMap',

		function(icMainMap){
			return {
				restrict : 		'E',
				scope:			true,
				templateUrl: 	'partials/ic-map-coordinate-picker-control.html',

				link: function(scope, element){
					scope.$watch(
						function(){ return icMainMap.picker && [icMainMap.picker.latitude , icMainMap.picker.longitude] },
						function(){
							element.addClass('changed')
							window.requestAnimationFrame(function(){
								element.removeClass('changed')
							})
						},
						true
					)
				}
			}
		}
	])

	.service('icMapSwitchControl', [

		'$compile',

		function($compile){

			L.Control.icMapSwitchControl = L.Control.extend({
				onAdd: function(map) {
					this._container = this._container || $compile('<ic-map-switch-control ic-item = "'+this.options.key+'"></ic-map-switch-control>')(this.options.scope)[0]
					return this._container
				},

				onRemove: function(map) {
				}
			})
		}
	])

	.directive('icMapSwitchControl',[

		'icSite',
		'icMainMap',
		'icItemRef',
		'ic',

		function(icSite, icMainMap, icItemRef, ic){
			return {
				restrict : 		'E',
				scope:			{
									icItem:	'<',
								},

				templateUrl: 	'partials/ic-map-switch-control.html',

				link: function(scope){

					scope.ic = ic

					scope.focusItem = function(){

						const projected = icItemRef.project(scope.icItem, ['latitude', 'longitude'])

						if(!hasValidGeoCoordinates(projected)){
							console.warn('icMiniMap: focusItemOnMap: missing coordinates.')
							return null
						}

						icSite.expandMap = true 

						icMainMap.ready
						.then(function(map){
							map.setView([projected.latitude, projected.longitude], icMainMap.defaults.maxZoom)	
						})

					}
				}
			}
		}
	])


	.provider('icMainMap', [		

		function(){


			// adding no Control Position:
			L.Map.prototype._initControlPos = function ( _initControlPos ) {
				return function () {
					_initControlPos.apply(this, arguments)
					this._controlCorners['topcenter'] 		= 	L.DomUtil.create('div', 'leaflet-top leaflet-center', 		this._controlContainer)
					this._controlCorners['bottomcenter'] 	=	L.DomUtil.create('div', 'leaflet-bottom leaflet-center',	this._controlContainer)
				}
			} (L.Map.prototype._initControlPos)


			var defaults	= 	{
									center:				[52.600, 13.350],
									zoom:				13,
									minZoom:			11,
									maxZoom:			18,
									maxBounds:			[
															[52.80, 13.80], 
															[52.20, 13.00]
														],
									maxClusterRadius: 	40,
									tiles:				undefined,
									consent:			undefined,
									//vectorTiles:		undefined
								}

			this.setDefaults = function(config){

				defaults = angular.extend({}, defaults, config)

				return this
			}

			this.$get =	[

				'$rootScope',
				'$q',
				'icMapItemMarker',
				'icItemStorage',
				'icSite',
				'icItemRef',
				'icConsent',
				'plTemplates',

				function($rootScope, $q ,icMapItemMarker, icItemStorage, icSite, icItemRef, icConsent, plTemplates){



					var mapReady 			= 	$q.defer(),
						markersReady 		= 	$q.defer(),
						icMainMap 			= 	{
													ready:			mapReady.promise,
													markersReady:	markersReady.promise,
													defaults:		defaults,
													mapObject: 		undefined,
													markerCache:	{},
													scope:			$rootScope.$new(),
												},		




					defaultPicker			=	{
													//title:		'Pick location, translation needed',
													latitude: 		icMainMap.defaults.center[0],
													longitude: 		icMainMap.defaults.center[1]
												}

					icMainMap.picker		=	angular.copy(defaultPicker)
					

					if(icMainMap.defaults.consent){
						icMainMap.consent 		=	icConsent.add('map_tiles', icMainMap.defaults.consent.server, icMainMap.defaults.consent.default, icMainMap.defaults.consent.customPrompt)
					}



					icMainMap.setMapObject = function(obj){
						if(icMainMap.mapObject) console.warn('icMainMap: mapObject already set!')
						icMainMap.mapObject = obj
						mapReady.resolve(icMainMap.mapObject)
					}

					icMainMap.clearMapObject = function(){
						mapReady.reject('map object cleared')
						mapReady = $q.defer()
						icMainMap.mapObject = undefined
						icMainMap.ready	= mapReady.promise
					}

					icMainMap.getMarker = function(item, options){

						const projected = icItemRef.project(item, ['latitude', 'longitude'])	

						if(!hasValidGeoCoordinates(projected)){
							console.warn('icMainMap: getMarker() missing coordinates at ', item)
							return null
						}



						if(item.id && !icMainMap.markerCache[item.id]){
							//maybe check if cahed scope and new scope are different (although this should never be the case)
							icMainMap.markerCache[item.id] =  new icMapItemMarker(item, icMainMap.scope)
						}

						if(typeof options != 'object') options = {}

						options.item		= item
						options.riseOnHover	= false
						options.icon 		= icMainMap.markerCache[item.id] || new icMapItemMarker(item, icMainMap.scope)

						

						return 	new L.marker(
									[projected.latitude, projected.longitude], 
									options
								)
					}


					// ensure pickingMode is off when site loads, even if the switch is on
					icSite.pickCoordinates = false
					$rootScope.$evalAsync(function(){ icSite.pickCoordinates = pickingDeferred && icSite.pickCoordinates })


					var pickingDeferred = undefined

					icMainMap.pickCoordinates = function(picker){


						pickingDeferred && pickingDeferred.reject()

						pickingDeferred = $q.defer()

						picker = picker || defaultPicker

						picker.latitude 	= Number(picker.latitude)
						picker.longitude 	= Number(picker.longitude)

						if(picker.latitude && picker.longitude) {
							picker.zoom = picker.zoom || icMainMap.defaults.maxZoom
						} else {
							picker.zoom = icMainMap.defaults.minZoom
						}

						if(!icMainMap.mapObject.options.maxBounds.contains([picker.latitude, picker.longitude])){
							picker = defaultPicker
						}

						icMainMap.picker = angular.copy(picker)

						icSite.pickCoordinates = true

						return pickingDeferred.promise
					}

					icMainMap.pickOkay = function(){
						pickingDeferred && pickingDeferred.resolve(angular.copy(icMainMap.picker))
						icSite.pickCoordinates 	= false
					}

					icMainMap.pickCancel = function(){
						pickingDeferred && pickingDeferred.reject()
						icSite.pickCoordinates 	= false
					}

					$q.all([
						icItemStorage.ready,
						plTemplates.ready				
					])
					.then(function(){
						icItemStorage.data.forEach(function(item){

							const projected = icItemRef.project(item, ['latitude', 'longitude'])

							if(hasValidGeoCoordinates(projected)) icMainMap.getMarker(item)

						})
						markersReady.resolve()
					})


					return icMainMap
				}
			]
		}
	])

	.directive('icMap',[

		'$rootScope',
		'$timeout',
		'$q',
		'icSite',
		'icItemStorage',
		'icItemRef',
		'icConsent',
		'icUtils',
		'icMainMap',
		'icMapItemMarker',
		'icMapClusterMarker',
		'icMapExpandControl',
		'icMapSpinnerControl',
		'icMapCoordinatePickerControl',
		'icMapMarkerDigestQueue',

		function($rootScope, $timeout, $q, icSite, icItemStorage, icItemRef, icConsent, icUtils, icMainMap, icMapItemMarker, icMapClusterMarker, icMapExpandControl, icMapSpinnerControl, icMapCoordinatePickerControl, icMapMarkerDigestQueue){
			return {
				restrict: 'AE',

				link: function(scope, element, attrs){


					if(!window.L) console.error('icMap: missing Leaflet!')

					scope.loading = 1

					icMainMap.ready.then(function(){ scope.loading-- })


					var markers 		= 	L.markerClusterGroup({
												maxClusterRadius: 			icMainMap.defaults.maxClusterRadius,
												spiderfyOnMaxZoom:			true,
												chunkedLoading:				true,
												zoomToBoundsOnClick:		false,
												animate:					false,
												iconCreateFunction: function(cluster) {		
													return new icMapClusterMarker(cluster)
												}
											} ),
						map 			= 	L.map(element[0], {
												center: 		icMainMap.defaults.center,
												zoom: 			icMainMap.defaults.zoom,
												minZoom:		icMainMap.defaults.minZoom,
												maxZoom:		icMainMap.defaults.maxZoom,
												zoomControl: 	false,
												trackSize:		false,
												maxBounds:		icMainMap.defaults.maxBounds,
												tap:			false,
												maxBoundsViscosity: 0.9

											}),


						pickerPane		=	map.createPane('pickerPane'),

						pickerMarker	=	icMainMap.getMarker(
												{
													latitude:	icMainMap.defaults.center[0],
													longitude:	icMainMap.defaults.center[1]
												}, 
												{
													draggable: 	true, 
													autoPan: 	true, 
													pane: 		'pickerPane'
												}
											).addTo(map),

						pickerControl	=	new L.Control.IcMapCoordinatePicker({ position: 	'bottomcenter' })


					new LocateControl({
						position: "bottomleft",
						
					}).addTo(map)	

					/** Add border if configured **/

					if(typeof borderGeoJson !== 'undefined'){

						L.geoJSON(borderGeoJson[0].geojson, { invert: true, renderer: L.svg({ padding: 1 }) })
						.setStyle({							
							invert:		true,
							color: 		icConfig.activeIconColor,
							fillColor:	'#000',
							weight: 	2,
							opacity: 	0.1,
							polygonCompOp: "dst-in"
						})
						.addTo(map)
					}


					icMainMap.setMapObject(map)
					
					icMapCoordinatePickerControl.setScope(scope)
					icMapExpandControl.setScope(scope)
					icMapSpinnerControl.setScope(scope)


					new L.Control.Zoom(					{ position: 'topright' 		}).addTo(map)
					new L.Control.IcMapExpand(			{ position: 'topleft'		}).addTo(map)
					new L.Control.icMapSpinnerControl(	{ position:	'bottomleft'	}).addTo(map)

					pickerMarker.on('dragend ', function(event){
						icMainMap.picker.latitude 	= event.target._latlng.lat
						icMainMap.picker.longitude	= event.target._latlng.lng
						scope.$digest()
					})
					

					map.on('layerremove', function(e){
						if(e.layer.scope) e.layer.scope.$destroy()
					})

					if(!icMainMap.defaults.tiles){ // && !icMainMap.defaults.vectorTiles){
						console.error('icMap: missing tiles! Check config file.')
						return null
					}



					if(icMainMap.defaults.tiles) addTiles()

					icConsent.events.addEventListener('change', addTiles )	

					// if(icMainMap.defaults.vectorTiles){

					// 	L.vectorGrid.protobuf(
					// 		icMainMap.defaults.vectorTiles,
					// 		{
					// 	//		vectorTileLayerStyles: {},
					// 	//		key: 'abcdefghi01234567890',
					// 	//		maxNativeZoom: 14,
					// 			attribution: '&copy; <a href ="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
					// 		}
					// 	).addTo(map);
					// }


					map.addLayer(markers)


					scope.$evalAsync(function(){adjustSize(map)})
					scope.$watch(function(){adjustSize(map)})


					angular.element(window).on('resize', function(){
						icUtils.schedule('adjustSize', function(){adjustSize(map)}, 200, true)
					})


					function addTiles(){

						$q.resolve( !icMainMap.consent || icConsent.when(icMainMap.consent.key) )
						.then( 
							() => {
							
								L.tileLayer(
									icMainMap.defaults.tiles,
									{
										attribution: '&copy; <a href ="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
									}
								).addTo(map)											

							},

							() => console.info('icMainMap: tile consent denied')
						)
					}

					function updateListMarkers(){

						markers.clearLayers()

						var	additional_items	=	icItemStorage.filteredList
													.filter( item => hasValidGeoCoordinates(icItemRef.project(item, ['latitude', 'longitude'])) )

						element[0].classList.add('marker-update')

						markers.addLayers(additional_items.map(icMainMap.getMarker))

						setTimeout(
							() => {
								element[0].classList.remove('marker-update')
							},
							1000
						)
						
						return icMapMarkerDigestQueue.currentRun
						
					}


					function updateActiveItemMarker(active_id, previous_id){

						var previous_in_list = previous_id && icItemStorage.filteredList.some(function(item){ return item.id == previous_id })


						//remove previous and active item marker
						markers.getLayers()
						.forEach(function(marker){ 
							if(marker.options.item && marker.options.item.id == active_id) 	
								markers.removeLayer(marker)

							if(marker.options.item && marker.options.item.id == previous_id && !previous_in_list) 	
								markers.removeLayer(marker)
						})


						//add active item marker
						if(
								icSite.activeItem
							&&	hasValidGeoCoordinates(icItemRef.project(icSite.activeItem, ['latitude', 'longitude']))
								
						){
							markers.addLayer(icMainMap.getMarker(icSite.activeItem))
						}

						markers.refreshClusters()
					}

					function switchMode(pickMode){

						if(!pickMode){

							pickerControl.remove()
							pickerPane.style.display = 'none'
							map.getPane('markerPane').style.display = 'block'

						} else {

							pickerControl.addTo(map)
							pickerPane.style.display = 'block'
							map.getPane('markerPane').style.display = 'none'							
							pickerMarker.setLatLng([icMainMap.picker.latitude, icMainMap.picker.longitude])
							map.setView([icMainMap.picker.latitude, icMainMap.picker.longitude], icMainMap.picker.zoom)

						}
					}


					updateListMarkers()


					scope.$watchCollection(
						function(){ 
							return icItemStorage.filteredList	
						},
						function(new_list, old_list){

							if(new_list.length == old_list.length){
								var check = {}
								for(var i = 0; i < new_list.length; i++){
									check[new_list[i].id] = true
									check[old_list[i].id] = true
								}
								if(Object.keys(check).length == new_list.length) return null
							}

							scope.loading++

							icUtils.schedule('updateListMarkers', updateListMarkers, 300, true)
							.finally(function(){
								scope.loading--
								icMapSpinnerControl.scope.$digest()
							})
						}
					),


					scope.$watchCollection(
						function(){

							const projected = icItemRef.project(icSite.activeItem, ['latitude', 'longitude'])

							return 	[
											icSite.activeItem && icSite.activeItem.id, 
											projected && projected.longitude, 
											projected && projected.latitude
									]
						}, 
						function(p,c){
							if(angular.equals(p,c)) return null

							window.requestAnimationFrame(function(){
								updateActiveItemMarker(p[0],c[0])								
							})
						}
					),

					scope.$watch(
						function(){ return icSite.pickCoordinates },
						switchMode
					),

					scope.$watch(
						function(){ return icMainMap.picker },
						function(){
							for(prop in pickerMarker.options.item){
								pickerMarker.options.item[prop] = undefined
							}

							for(prop in icMainMap.picker){
								pickerMarker.options.item[prop] = icMainMap.picker[prop]
							}
						}
					),



					scope.$on('$destroy', function(){
						icMainMap.clearMapObject()
						// stop_watching_filteredList()
						// stop_watching_activeItem()
						// stop_watching()
						// stop_watching_pickMode()
						// stop_watching_picker()
						angular.element(window).off('resize', function(){adjustSize(map)})
					})


				}
			}
		}
	])



	.directive('icMiniMap',[

		'icMainMap',
		'icMapItemMarker',
		'icMapSwitchControl',
		'icItemRef',

		function(icMainMap, icMapItemMarker, icMapSwitchControl, icItemRef){
			return {
				restrict: 	'AE',
				scope:		{
								icItem: 	'<',
							},

				link: function(scope, element){

					if(!window.L) console.error('icMiniMap: missing Leaflet!')


					var	map 	= 	L.map(element[0], {
										zoom: 			16,
										minZoom:		16,
										maxZoom:		16,
										zoomControl: 	false,
										doubleClickZoom:false,
										scrollWheelZoom:false,
										boxZoom:		false,
										dragging:		false,
										touchZoom:		false
									}),
						marker	=	undefined

					
					if (map.tap) {
					  map.tap.disable();
					}



					new L.Control.icMapSwitchControl({ 
						position: 	'topright',
						scope:		scope,
						key:		'icItem'
					}).addTo(map)

					L.tileLayer(
						icMainMap.defaults.tiles,
						{
							attribution: '&copy; <a href ="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
						}
					).addTo(map)



					scope.$evalAsync(function(){adjustSize(map)})
					scope.$watch(function(){adjustSize(map)})
			
					scope.$watch('icItem', function(icItem){
						if(marker) marker.remove()

						const projected = icItemRef.project(icItem, ['latitude', 'longitude'])


						if(
								!projected
							||	!projected.latitude
							||	!projected.longitude
							||	typeof projected.latitude		!=  'number'
							||	typeof projected.longitude 		!=  'number'
							||  Math.abs(projected.latitude) 	> 90
							||  Math.abs(projected.longitude)	> 180
						){
							return null
						}


						marker = L.marker(
							[projected.latitude, projected.longitude], 
							{
								icon: new icMapItemMarker(icItem, scope),
								item: icItem,
							}
						)
						.addTo(map)

						map.setView([projected.latitude, projected.longitude])
					})


				}
			}
		}

	])
}())
