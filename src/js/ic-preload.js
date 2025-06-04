
"use strict";

(function(){

	angular.module('icPreload',[])

	.provider('plImages', function(){

		var jsonFile = undefined

		this.setJsonFile = function(a){ jsonFile = a }

		this.$get = [

			'$q',
			'$http',

			function($q, $http){

				let deferStart	= 	$q.defer()

				this.start 		= 	deferStart.resolve
				
				const ready 	= 	(async () => {
										await deferStart.promise
										const response 	= await fetch(jsonFile)
										const images	= await response.json()

										if(!Array.isArray(images)){
											console.warn("Unable to preload images. Image data is not an Array.")
											return
										}
									
										await 	Promise.all(images.map(url => new Promise(function(resolve, reject){

													var img = new Image()

													img.addEventListener('load', function(){
														resolve()
														img = null
													})

													img.addEventListener('error', function(event){
														console.error('icPreload:', url, event)
														reject()
														img = null
													})

													img.src = url

												})))
															
									})()

				this.ready = $q.resolve(ready)

				return this

			}
		]

	})

	.provider('plStyles', function(){

		var jsonFile 	= undefined,
			files		= undefined

		this.setJsonFile 	= function(a){ jsonFile 	= a }
		this.setFiles		= function(f){ files 		= f }	 

		this.$get = [

			'$q',
			'$http',

			function($q, $http){

				function loadStyles(files){
					return		Promise.all(files.map(function(url){
									return new Promise(function(resolve, reject){
										var l = document.createElement('link')

											l.setAttribute('rel',	'stylesheet')
											l.setAttribute('type',	'text/css')
											l.setAttribute('href',	url)
											l.addEventListener('load', resolve )
											document.head.appendChild(l)
									})
								}))
				}
				
				let ready = 	Promise.resolve()
								.then( function()		{	return 	files ? {data : files} : $http.get(jsonFile) })
								.then( function(result)	{	return 	result.data })
								.then( function(styles)	{	

									if(typeof styles == 'string') styles = [styles]
									
									styles = styles.filter(function(filename){ return !!filename})

									return loadStyles(styles) 

								})
								.catch(console.log)

				this.ready = $q.resolve(ready)

				return this

			}
		]

	})


	.provider('plTemplates',function(){

		var jsonFile = undefined

		this.setJsonFile = function(a){ jsonFile = a }


		this.$get = [

			'$q',
			'$http',
			'$templateCache',

			function($q, $http, $templateCache){


				let ready = 	Promise.resolve()
								.then(function()			{ return 	$http.get(jsonFile) } )
								.then(function(result)		{ return 	result.data })
								.then(function(templates)	{ return 	Promise.all(templates.map(function(template){
																			$templateCache.put(template.name, template.content)																						
																		}))
															}
								)

				this.ready = $q.resolve(ready)

				return this

			}
		]

	})

})()