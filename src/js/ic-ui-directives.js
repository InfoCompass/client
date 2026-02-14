"use strict";


/* marked target="_blank" */
const renderer 		= new marked.Renderer()
const linkRenderer 	= renderer.link

renderer.link = (href, title, text) => {

	const external	= 	href.startsWith('http')

	const html 		= 	linkRenderer.call(renderer, href, title, text)

	return 	external
			?	html.replace(/^<a /, `<a target="_blank" rel="noreferrer noopener nofollow" `)
			:	html 
}

marked.use({renderer})


/* end marked */


angular.module('icUiDirectives', [
	//translate...
])


.directive('icClick',[
	function(){
		return {
			restrict:	'A',

			link: function(scope, element, attrs){

				function trigger(e){
					e.stopPropagation()
					scope.$eval(attrs.icClick)
					scope.$digest()					
				}

				element.on('click', trigger)
				scope.$on('$destroy', function(){ element.off('click', trigger) })
			}
		}
	}
])


.directive('icTouchMe', [
	function(){
		return {
			restrict:		'A',
			link: function(scope, element, attrs){

				var fading_time = 400


				function add(){
					angular.element(document.body).one('touchend mouseup', remove)									
					element.addClass('ic-touched')	
				}

				function remove(){
					element.addClass('ic-touch-fade')
					window.requestAnimationFrame(function(){
						element.removeClass('ic-touched')					
						window.setTimeout(function(){
							element.removeClass('ic-touch-fade')
						}, fading_time)
					})
				}

				function stop(){
					element.off('touchstart mousedown', add)
					angular.element(document.body).off('touchend mouseup', remove)
				}

				scope.$watch(
					function(){
						return scope.$eval(attrs.icTouchMe)
					},
					function(attr){
						stop()
						if(typeof attr != 'boolean' || attr === true){
							fading_time = parseInt(attr)  || 400
							element.on('touchstart mousedown', add)							
						}

					}
				)

				scope.$on('$destroy', stop)

			}
		}
	}
])

.directive('icNoTab',[

	function(){

		return {

			restrict:	'A',

			link: function(scope, element, attrs){

				const observer 	= 	new MutationObserver(updateTabs)

				function updateTabs(mutationList){	

					mutationList = Array.from(mutationList || [])

					tabbables = Array.from(element[0].querySelectorAll('a[href], button, input, [tabindex]'))					

					tabbables.forEach( tabbable => tabbable.setAttribute('tabIndex', -1) )

				}

				observer.observe(element[0],{subtree: true, childList: true})

			}
		}
	}

])

.directive('icTabGroup',[


	function(){

		return {

			restrict:	'A',

			link: function(scope, element, attrs){

				const observer 			= 	new MutationObserver(updateTabs)

				const default_config	=	{
												cycle: false
											}

				let config				=	null


				let tabbables			=	[]

				let subgroups			=	[]

				let last_tabbed			=	null


				function setup(c){

					if(!config){
						observer.observe(element[0],{subtree: true, childList: true})
						element[0].addEventListener('focusin', trackTabbable)
						element[0].addEventListener('focusout', trackTabbable)
						document.addEventListener('keydown', onKeyDown)
					}

					element[0].classList.add('ic-tab-group')


					config = Object.assign({}, default_config, c)

					updateTabs()

				}

				function teardown(){

					element[0].classList.remove('ic-tab-group')
					last_tabbed = null


					if(!config) return null

					config = null

					observer.disconnect()
					element[0].removeEventListener('focusin', trackTabbable)
					element[0].removeEventListener('focusout', trackTabbable)
					document.removeEventListener('keydown', onKeyDown)
				}

				scope.$watch(attrs.icTabGroup, config => {


					if(!attrs.icTabGroup) config = true

					config
					?	setup(config)
					:	teardown()

				}, true)


				function trackTabbable(){

					if(last_tabbed && !element[0].contains(last_tabbed)){					
						updateTabs()
					} 

					last_tabbed = 	element[0].contains(document.activeElement)
									?	document.activeElement
									:	null

				}
				


				function updateTabs(mutationList){	

					if(!config) return null
				

					mutationList = Array.from(mutationList || [])

					subgroups	= Array.from(element[0].querySelectorAll('[ic-tab-group],[ic-no-tab]'))						
					tabbables 	= Array.from(element[0].querySelectorAll('a[href], button, input, [tabindex]'))					


					tabbables	= tabbables.filter( tabbable => !subgroups.some( subgroup => subgroup.contains(tabbable) ) )

					const fallback_tabbable = 	element[0].querySelector('[tabindex="0"]') || tabbables[0]

					tabbables.forEach( tabbable => tabbable.setAttribute('tabIndex', -1))

					let activeTabbable 	=	element[0].contains(document.activeElement)
											?	document.activeElement
											:	fallback_tabbable

					removed_tabbable	=	last_tabbed && !element[0].contains(last_tabbed)

					activeTabbable && activeTabbable.setAttribute('tabindex', 0)

					if(removed_tabbable) activeTabbable && activeTabbable.focus()

				}


				function onKeyDown(event){			

					if(!config) return null


					if(!element[0].contains(document.activeElement)) 							return null
					if(subgroups.some( subgroup => subgroup.contains(document.activeElement)))	return null
					if(tabbables.length == 0) 													return null

					let dir = 0


					switch(event.keyCode){
						//ESC
						case 27: return document.activeElement.blur()

						//left	
						//case 37: dir = -1; break					

						//up	
						case 38: dir = -1; break					

						//right	
						//case 39: dir = +1; break					

						//down	
						case 40: dir = +1; break

						default: return null
					}

					let current_index 	= 	tabbables.indexOf(document.activeElement)
					let new_index		= 	config.cycle
											?	(tabbables.length + current_index + dir) % tabbables.length
											:	Math.min( Math.max(current_index + dir, 0), tabbables.length-1) 

					if(config.cycle || new_index == current_index + dir ) event.preventDefault()		



					tabbables[new_index].focus()
					updateTabs()

				}


				scope.$on("$destroy", () => {
					teardown()
				})

			}


		}
	}

])

.directive('icAutoFill',[

	'icAutoFill',

	function(icAutoFill){

		return {
			restrict:	'A',
			require:	"ngModel",	
			scope:		{
							icAutoFill : "<"
						},		

			link: function(scope, element, attrs, ctrl){

				ctrl.$viewChangeListeners.push( () => icAutoFill.updateValue(scope.icAutoFill, ctrl.$modelValue) )

			}
		}
	}
])

.directive('icRemove', [

	'$timeout',

	function($timeout){
		
		return {
			restrict:	'A',

			link: function(scope, element, attrs){

				var stop_watching = scope.$watch(attrs.icRemove, function(new_value, old_value){

					if(!new_value) return null

					var delay = parseInt(attrs.icDelay)

					if(isNaN(delay)) delay = 0

					element.addClass('ic-remove')

					$timeout(delay)
					.then(clear)
				})

				function clear(){
					element.remove()
					stop_watching()
				}
			}
		}
	}

])


.directive('icScrollRepeatLimit',[

	'$timeout',

	function($timeout){
		return {
			restrict:	'A',

			link: function(scope, element, attrs){


				var container 	= element[0],
					step_size	= parseInt(attrs.icScrollRepeatLimitStepSize) || 10,
					l			= attrs.icScrollRepeatLimitAs || 'icScrollRepeatLimit'

				// Sometimes the event handle onScroll keeps fireing for an old result list element
				// Keeping track of the most recent one to avoid conflicts
				scope.element = element[0]	


				while( (container = container.parentElement) && !container.hasAttribute('ic-scroll-repeat-limit-container')){}




				if(!container){
					console.warn('icScrollRepeatLimit: missing container.', element[0])
					return null
				}
				container = angular.element(container)


				scope[l] = step_size


				scope.icScrollRepeatLimitIncrease = function(){
					scope[l] += step_size
				}


				function updateLimit(){

					const elementRect	= element[0].getBoundingClientRect()
					const containerRect	= container[0].getBoundingClientRect()

					const elementHeight = elementRect.bottom-elementRect.top

					if(elementHeight <= 0 )	return false

					const surplus = elementRect.bottom-containerRect.bottom


					const noDecrease 	= 'icScrollRepeatLimitNoDecrease' in attrs

					const outerHeight	= container[0].clientHeight

					const increaseWarrented = surplus <   outerHeight && !scope.noMoreItems
					const decreaseWarrented = surplus > 2*outerHeight && !noDecrease

					const changeWarrented	= increaseWarrented || decreaseWarrented

					if(!changeWarrented) return false

					if(increaseWarrented)	scope[l] += step_size						
					if(decreaseWarrented)	scope[l] -= step_size					

					scope.$apply()	

					return true
				}

				let updateScheduled = false

				function scheduleUpdate(){
					if(updateScheduled) return

					window.setTimeout( () => {

						updateScheduled = false

						const limitUpdated = updateLimit()
						if(limitUpdated) scheduleUpdate()

					}, 250)

					updateScheduled = true 
				}

				let heightCheckScheduled 	= false
				let lastHeightValue			= undefined

				function scheduleHeightCheck(){
					
					if(!heightCheckScheduled){	
						window.setTimeout( () => {

							heightCheckScheduled = false

							const elementRect	= element[0].getBoundingClientRect()
							const containerRect	= container[0].getBoundingClientRect()
							const elementHeight = Math.floor(elementRect.bottom-elementRect.top)

							if(elementHeight == lastHeightValue) return

							lastHeightValue = elementHeight
							
							scope.$digest()	
							

						}, 250)
					}

					return lastHeightValue

				}


				scope.$watchCollection(
					function(){

						const elementHeight = scheduleHeightCheck()

						return [scope.$eval(attrs.icScrollRepeatLimit), scope[l], elementHeight]
					}, 
					function(obj){

						var max = obj[0]
						scope[l] 			= Math.max(Math.min(max, scope[l]), step_size)
						scope.noMoreItems 	= max <= scope[l]
						scope.noScroll 		= container[0].clientHeight == container[0].scrollHeight
						scheduleUpdate()						
					}
				)


				container[0].addEventListener('scroll', scheduleUpdate, { passive:true })
			
				scheduleUpdate()

				scope.$on('$destroy', function(){
					container[0].removeEventListener('scroll', onScroll)
				})
				
			}
		}
	}

])


.service('icScrollSources',[

	function(){


		var icScrollSources 

		try {
			icScrollSources = new EventTarget()
		} catch(e){
			icScrollSources = document.createElement('div')
		}

		icScrollSources.sources = {}

		function scroll(e){
			var element 	= e.target,
				source_name	= undefined


			for(var key in icScrollSources.sources){
				if(icScrollSources.sources[key] == element) source_name = key
			}

			var event = new CustomEvent('remote-scroll', { detail: {sourceName: source_name, sourceElement: element, sourceEvent: e }})
			icScrollSources.dispatchEvent(event)
		}



		icScrollSources.registerScrollSource = function(source_name, element){

			element = element[0] || element

			if(icScrollSources.sources[source_name]) icScrollSources.deRegisterScrollSource(source_name, icScrollSources.sources[source_name])

			element.addEventListener('scroll', scroll)
			icScrollSources.sources[source_name] = element

			//fake a scroll for the first run:
			icScrollSources.dispatchEvent(new CustomEvent('remote-scroll', { detail: {sourceName: source_name, sourceElement: element}}))

			return icScrollSources
		}



		icScrollSources.deRegisterScrollSource = function(source_name, element){

			element = element[0] || element

			element.removeEventListener('scroll', scroll)

			if(icScrollSources.sources[source_name] == element) icScrollSources.sources[source_name] = undefined

			return icScrollSources
		}

		return icScrollSources
	}
])

.directive('icScrollSource',[

	'icScrollSources',

	function(icScrollSources){
		return{
			link:function(scope, element, attrs){

				var source_name = scope.$eval(attrs.icScrollSource) || attrs.icScrollSource

				icScrollSources.registerScrollSource(source_name, element)

				scope.$on('$destroy', function(){
					icScrollSources.deRegisterScrollSource(source_name, element)
				})
			}
		}
	}
])


.directive('icOnScroll',[

	'icScrollSources',

	function(icScrollSources){
		return {
			link: function(scope, element, attrs){

				var last_result = undefined

				onScroll = event => {
					result = scope.$eval(attrs.icOnScroll)
					
					if(result !== last_result){
						scope.$evalAsync(attrs.icOnScroll)
					}
					
				}

				icScrollSources.addEventListener('remote-scroll', onScroll)

				scope.$on('$destroy', function(){
					icScrollSources.removeEventListener('remote-scroll', onScroll)
				})
	
			}
		}
	}
])

.directive('icScrollWatch',[

	'icScrollSources',

	function(icScrollSources){
		return {
			link: function(scope, element, attrs){

				var target				= undefined,
					sources				= icScrollSources.sources,
					to					= undefined,
					expect_scroll		= false,
					stop_snapping		= false,
					threshold			= 0.15,
					check_requested		= false
					apply_requested		= false


				function check(){
					if(check_requested) return null
					check_requested = true

					window.requestAnimationFrame(function(){
						check_requested = false

						if(!element) return null //the animation frame can trigger after the element has been removed

						if(typeof target == 'boolean'){
							element.toggleClass('ic-scroll-top', 	target)
							element.toggleClass('ic-scroll-bottom',	false)
							return null
						}
						
						var sourceElement = icScrollSources.sources[target]

						if(!sourceElement) return null //the animation frame can trigger after the element has been removed

						var belowTop 	= 	sourceElement.scrollTop > 0 
											&& 	element[0].offsetHeight + sourceElement.clientHeight < sourceElement.scrollHeight

						var aboveBottom	=	sourceElement.scrollTop + sourceElement.clientHeight < sourceElement.scrollHeight 
											&& 	element[0].offsetHeight + sourceElement.clientHeight < sourceElement.scrollHeight


						element.toggleClass('ic-scroll-top', belowTop)		
						element.toggleClass('ic-scroll-bottom', aboveBottom)

						if(apply_requested) return null	
						if(belowTop == scope.icScrollBelowTop && aboveBottom == scope.icScrollAboveBottom)	return null

						scope.icScrollBelowTop 		= belowTop
						scope.icScrollAboveBottom 	= aboveBottom

						apply_requested = true
						scope.$apply( () => apply_requested = false)	

					})

				}


				function beforeScroll(event){
					if(event.detail.sourceName != target) return null
					check()
				}

				scope.scrollTop = function(){
					window.requestAnimationFrame( () => {
						if(target && sources[target]) sources[target].scrollTop = 0

					})
				}

				scope.scrollBottom = function(){
					window.requestAnimationFrame( () => {
						if(target && sources[target]) sources[target].scrollTop = sources[target].scrollHeight
					})
				}

				scope.$watch(
					function(){
						var t = scope.$eval(attrs.icScrollWatch)

						if(['string', 'boolean'].indexOf(typeof t) == -1) t = attrs.icScrollWatch

						check()

						if(t === target) return null

						target = t

						typeof target == 'string'
						?	icScrollSources.addEventListener('remote-scroll', beforeScroll, true)
						:	icScrollSources.removeEventListener('remote-scroll', beforeScroll)
					}
				)

				scope.$on('$destroy', function(){
					icScrollSources.removeEventListener('remote-scroll', beforeScroll)
				})



			}
		}
	}
])



.directive('icSpinner', [

	'$timeout',

	function($timeout){
		return {
			restrict:		'AE',
			templateUrl:	'partials/ic-spinner.html',
			scope:			{
								active:	"<"
							},

			link: function(scope, element, attrs){

				var to = undefined 

				scope.$watch('active', function(active){
					if(to) $timeout.cancel(to)

					active
					?	element.addClass('active')
					:	to = $timeout(function(){ element.removeClass('active') }, 1000, false)
				})
			}
		}
	}
])



.directive('icSettleScrollbar',[

	'$rootScope',
	
	function($rootScope){

		var scrollbar_width = undefined,
			style_element 	= undefined

		function getScrollBarwidth(){
			var div	= 	angular.element('<div></div>')
						.css({
							'width': 		'100px',
							'height':		'100px',
							'position':		'absolute',
							'overflow-y':	'scroll'
						})

			angular.element(document.getElementsByTagName('body')[0]).append(div)

			scrollbar_width	=	(100-div[0].clientWidth)

			div.remove()
		}

		function addCssRules(){
			style_element = document.createElement('style')

		  	document.head.appendChild(style_element)

				//[ic-settle-scrollbar]:focus-within > *,	
				//[ic-scroll-watch]:focus-within + [ic-settle-scrollbar][ic-scroll-source] > * {
			style_element.sheet.insertRule(`
				[ic-settle-scrollbar]:hover > *,	
				[ic-scroll-watch]:hover + [ic-settle-scrollbar][ic-scroll-source] > * {
					margin-right: -${scrollbar_width}px;
				}
			` , 0)

			var fixed_styles = document.createElement('style')

		  	document.head.appendChild(fixed_styles)

			fixed_styles.sheet.insertRule(`
				[ic-settle-scrollbar] { 
					box-sizing: border-box; 
					max-height: 100%; 
					overflow-x: hidden; 
					overflow-y: hidden; 
					-webkit-overflow-scrolling: touch;
				}
			`)

				//[ic-settle-scrollbar]:focus-within,
				//[ic-scroll-watch]:focus-within + [ic-settle-scrollbar][ic-scroll-source] { 
			fixed_styles.sheet.insertRule(`
				[ic-settle-scrollbar]:hover, 
				[ic-scroll-watch]:hover + [ic-settle-scrollbar][ic-scroll-source] {
					overflow-y: scroll; 
					-webkit-overflow-scrolling: touch; 
			}`)
		}

		var adjustment_scheduled = false

		function adjust(){
			if(adjustment_scheduled) return null

			adjustment_scheduled = true

			window.requestAnimationFrame(function(){
				getScrollBarwidth()

				style_element.sheet.deleteRule(0)

				adjustment_scheduled = false
				if(scrollbar_width == 0) return null
				
					//[ic-settle-scrollbar]:focus-within > *,	
					//[ic-scroll-watch]:focus-within + [ic-settle-scrollbar][ic-scroll-source] > * {
				style_element.sheet.insertRule(`
					[ic-settle-scrollbar]:hover > *,	
					[ic-scroll-watch]:hover + [ic-settle-scrollbar][ic-scroll-source] > * {
						margin-right: -${scrollbar_width}px;
					}
				`, 0)
				
			})
		}


		getScrollBarwidth()

		if(scrollbar_width == 0) return {}



		addCssRules()
			

		angular.element(window).on('resize', adjust)
		$rootScope.$watch(adjust)


		return {
			restrict:	'A',

			link: function(scope, element){
				
			}
		}
	}
])

.directive('icButton', [

	function(){
		return  {
			restrict:	'A',
			scope:		true,

			link: function(scope, element, attrs){

				element[0].hasAttribute('tabindex') || element[0].setAttribute('tabindex', 0)

				scope.$watch(attrs.icButton, function(obj){
					if(!obj) return null
					scope.active 	= !!obj.active
					scope.disabled 	= !!obj.disabled 
				})
			}
		}
	}
])



.directive('focusMe', [
	function(){
		return {
			restrict: 'A',

			link: function(scope, element, attrs){

				if(attrs.focusMe === undefined || attrs.focusMe === "") element[0].focus()
				
				function getFirstTabbable(){
					if(element[0].hasAttribute('tabindex') && element[0].getAttribute('tabindex') != '-1') return element[0]

					var tabbable = element[0].querySelector('a[href], button, input, [tabindex]:not([tabindex="-1"])')

					if(tabbable) return tabbable

					return element[0]	
				}

				scope.$watch(attrs.focusMe,  (new_value) => {		

					if(new_value){

						var tabbable = getFirstTabbable()

						window.requestAnimationFrame( () => tabbable.focus({preventScroll: true}) )
					}
				})

			}
		}
	}
])


.directive('icScrollTo', [
	function(){
		return {
			restrict:	'A',

			link: function(scope, element, attrs){


				scope.$watch(attrs.scrollTop, function(){

					var target = attrs.icScrollTo.toLowerCase()


					element.on('click touch', function(){


						var scroll_parent = element[0]

						while(scroll_parent && scroll_parent.scrollHeight == scroll_parent.offsetHeight){
							scroll_parent = scroll_parent.parentElement							
						}

						if(!scroll_parent) return null

						if( target == 'top') 	scroll_parent.scrollTop = 0
						if( target == 'bottom') scroll_parent.scrollTop = scroll_parent.scrollHeight
					})

				})
			}
		}
	}
])



.directive('icScrollTop', [
	function(){
		return {
			restrict:	'A',

			link: function(scope, element, attrs){

				scope.$watch(attrs.scrollTop, function(){

					var el = element

					while(el && el [0]){
						el[0].scrollTop = 0
						el = el.parent()
					}
				})
			}
		}
	}
])

.directive('icClickOutside', [
	function(){
		return {
			restrict:	'A',

			link: function(scope, element, attrs){

				var body	= angular.element(document.getElementsByTagName('body'))

				function click(e){
					var c = e.target

					while(c && c != element[0]){ c = c.parentElement }

					if(!c){	
						scope.$eval(attrs.icClickOutside)
						scope.$apply()
					}

				}

				body.on('click touchstart', click)

				// what was this for?  break href =/
				// element.on('click touchstart', function(event){
				// 	event.stopPropagation();
				// })

				scope.$on('$destroy', function(){
					body.off('click', click)
				})

			}
		}
	}
])




.directive('icAutoGrow', [

	function(){
		return {
			restrict:	"A",
			require:	"ngModel",

			link: function(scope, element, attrs, ctrl){

				function resize(){
					window.requestAnimationFrame(function(){
						element.css('height', 'auto')
						element.css('height', element[0].scrollHeight + 'px')
					})
				}

				element.on('blur keyup keydown change focus blur',resize)
				ctrl.$viewChangeListeners.push(resize)

				scope.$watch(attrs.ngModel, resize)
			}
		}
	}

])




.directive('icExposeInternalModel', [

	function(){
		return {
			restrict:	"A",
			require:	"ngModel",

			link: function(scope, element, attrs, ctrl){

				element.on('change keyup paste click input blur', function(){
					scope.$parent[attrs.icExposeInternalModel] = element[0].value
					scope.$parent.$apply()
				})
			}
		}
	}
])


.directive('icCarousel',[

	'$interval',

	function($interval){
		return {
			restrict:		"AE",
			transclude:		"true",
			scope:			true,
			templateUrl:	"partials/ic-carousel.html",

			link: function(scope, element, attrs, ctrl, transclude){

				transclude(scope, function(clone) {
					angular.element(element[0].querySelector('.transclude')).append(clone)
				})

				scope.carousel					= {}
				scope.carousel.images 			= []
				scope.carousel.position 		= 0
				scope.carousel.autoTurn			= false
				scope.carousel.stopAutoTurn 	= function(){}



				var translation = 0,
					width		= 0,
					height		= 0



				function updateImageSize(){
					window.requestAnimationFrame(function(){
						
						if( width == element[0].clientWidth && height == element[0].clientHeight ) return null


						width		= element[0].clientWidth
						height		= element[0].clientHeight


						element[0].querySelectorAll('.shuttle .image')
						.forEach( function(i_element){
							i_element.style.width 	= width  + 'px'
							i_element.style.height 	= height + 'px'
						})

						resetToPosition()
					})
				}


				function turnBy(amount){
					if(scope.carousel.images.length <=1 ) return null

					amount = amount % scope.carousel.images.length

					centerView()

					translation = translation + amount * element[0].clientWidth

					updateView()
					
				}


				function resetToPosition(){

					var shuttle 	= element[0].children[0],
						round 		= element[0].clientWidth * scope.carousel.images.length

					translation = scope.carousel.position * element[0].clientWidth + round

					shuttle.style.transitionDuration = '0ms'
					shuttle.style.transform = 'translateX(-'+ translation +'px)'
				}


				function centerView(){
					var shuttle 	= element[0].children[0],
						round		= element[0].clientWidth * scope.carousel.images.length

					var px_match 	= shuttle.style.transform.match(/translateX\((.+)px\)/)

					translation	= (-1* parseInt(px_match ? px_match[1] : 0) ) % round + round

					shuttle.style.transitionDuration = '0ms'
					shuttle.style.transform = 'translateX(-'+ translation +'px)'
				}


				function updateView(){

					window.requestAnimationFrame(function(){
						var shuttle = element[0].children[0]

						shuttle.style.transitionDuration = null
						shuttle.style.transform = 'translateX(-'+ translation +'px)'

					})
				}

				Object.defineProperty(scope, 'currentImage', {
					get: function() { return scope.carousel.images[scope.carousel.position] }
				})

				scope.$watch('carousel.position', function(new_pos, old_pos){

					if(scope.carousel.images.length <= 1) 	return null

					var way_1 	= (new_pos - old_pos) % scope.carousel.images.length,		
						way_2 	= scope.carousel.images.length - way_1

					if(way_1 == 0 ) return null

					scope.carousel.position = new_pos % scope.carousel.images.length

					Math.abs(way_1) < Math.abs(way_2)
					?	turnBy(way_1)	
					:	turnBy(way_2)	
					
				})

				scope.$watchCollection(attrs.icCarousel || attrs.icImages, function(images){


					scope.carousel.images = (images || []).map( image_entry => {


												const image_str	= image_entry.image || image_entry

												if(typeof image_str != 'string'){
													console.warn('icCarousel invalid icImages entry: ', image_entry)
													return null
												}

												const is_file 		= !!image_str.match(/\./)
												const is_class		= !is_file

												return	{
															file	: 	is_file	
																		?	'background-image: url(${image_str})' 
																		:	undefined,

															class 	:	is_class	
																		?	image_str 							
																		:	'',

															caption	:	image_entry.caption || undefined,

															link	:	image_entry.link,
															main	:	image_entry.main,
															sub		:	image_entry.sub

														}
											})

					resetToPosition()
				})

				scope.$watch(attrs.icAutoTurn, function(x){
					scope.carousel.stopAutoTurn()
					scope.carousel.autoTurn = parseInt(x)
					if(!scope.carousel.autoTurn) return null
					scope.carousel.stopAutoTurn = $interval(function(){ scope.carousel.position = scope.carousel.position +1 }, scope.carousel.autoTurn)
				})

				scope.$on('$destroy', scope.carousel.stopAutoTurn)

				angular.element(window).on('resize', updateImageSize)
				scope.$watch(updateImageSize)

			}
		}
	}

])


.directive('icToggle', [

	function(){
		return {
			restrict: 		"E",
			template: 		`
								<div 
									class = "shuttle"

								>
									<div class ="on">
										{{on || ("INTERFACE.ON"|translate) }}
									</div>
									<div class = "indicator"></div>
									<div class ="off">
										{{ off || ("INTERFACE.OFF"|translate)}}
									</div>
								</div>
							`,
			scope:			{
								on: 	"@",
								off:	"@",
								value:	"=",
							},

			link: function(scope, element, attr){

				element[0].setAttribute('tabindex', 0)
				element[0].setAttribute('role', "button")


				scope.role = "button"

				element.on('click', 	event => scope.toggle(event) )
				element.on('keydown', 	event => scope.toggle(event) )

				scope.toggle = (event) => {

					if(attr.disabled) return null

					if(
					 		event instanceof KeyboardEvent
					 	&&	event.key !== " " 
					 	&&	event.key !== "Enter" 
					 	&&	event.key !== "Spacebar"

					) return
    
    				event.preventDefault()

					scope.$evalAsync( () => {	
						scope.value = !scope.value 
					})

				}


				attr.$observe('on', 	function(value) { scope.on 	= value })					
				attr.$observe('off',	function(value) { scope.off = value })

				scope.$watch('value', function(value){
					if(value){
						element.addClass('on')
						element.removeClass('off')						
						element[0].setAttribute('aria-pressed', "true")
					} else {
						element.removeClass('on')
						element.addClass('off')
						element[0].setAttribute('aria-pressed', "false")

					}
				})					
			}
		}
	}

])


.directive('icWatch', [

	function(){
		return{
			restrict:		"A",

			link: function(scope, element, attrs, ctrl){

				var config = scope.$eval(attrs.icWatch)

				Object.keys(config).forEach(function(key){
					scope.$watch(key, function(){
						scope.$eval(config[key])
					})
				})

			}
		}
	}
])


.directive('icExtend', [

	function(){
		return{
			restrict:		"A",
			scope:			{
								icExtend : '<'
							},

			link: function(scope, element, attrs, ctrl){


				function update(){
					

					const contentHeight 	= 	Array.from(element[0].children)
												.reduce( (sum, el) => {
													return sum + el.offsetHeight
												},0)
					
					element[0].style.height = 	scope.icExtend
												?	contentHeight+'px'
												:	'0px'

					element[0].classList.toggle('extended', scope.icExtend)							
				}
				
				const mutationObserver		= 	new MutationObserver(update)
				const resizeObserver		=	new ResizeObserver(update)

				mutationObserver.observe(element[0], { subtree: true, childList: true })
				resizeObserver.observe(element[0])
				scope.$watch( () => scope.icExtend, update)

			}
		}
	}
])



.filter('fill', [
	function(){
		return function(str, rep){

			rep =	typeof rep == 'boolean'
					?	String(rep)
					:	rep

			rep = 	rep === undefined 
					?	'undefined'
					:	rep
			
			rep = 	Array.isArray(rep)
					?	rep  
					:	[rep] 

			rep = 	rep.map(function(r){
						if(typeof r != 'string') return ''
						return 	r
								.replace(/\s/g, '_')
								.replace(/([a-z])([A-Z])/g, '$1_$2')
								.toUpperCase()
					})



			return 	rep.reduce(function(s, r){
						return s.replace(/%s/, r)
					}, str)
		}
	}
])

.filter('trim',[
	function(){
		return function(str){
			str = str || ''
			return str.replace(/^\s+|\s+$/g,'')
		}
	}
])



.filter('in',[
	function(){
		return function(x, a){
			return a && a.indexOf(x) != -1
		}
	}
])

.filter('includes',[
	function(){
		return function(a, ...needles){
			return needles.every( n => Array.isArray(a) && a.includes(n) )
		}
	}
])

.filter('lacks',[
	function(){
		return function(a, ...needles){
			return needles.every( n => Array.isArray(a) && !a.includes(n) )
		}
	}
])




.filter('section', [
	function(){
		return function(arr_1, arr_2){

			Array.isArray(arr_2) || (arr_2 = [arr_2])

			return 	arr_1
					?	arr_1.filter(function(item){ return arr_2 && arr_2.indexOf(item) != -1})
					:	[]
		}
	}
])

.filter('add', [
	function(){
		return function(arr_1, arr_2){

			Array.isArray(arr_2) || (arr_2 = [arr_2])

			return 	arr_1
					?	[...arr_1, ...arr_2]
					:	[]
		}
	}	
])

.filter('flatten', [
	function(){
		return function(obj, include_keys, exclude_keys){
			var result 	= [],
				keys	= include_keys || Object.keys(obj)



			if(typeof keys 			== 'string') keys 			= [keys]
			if(typeof exclude_keys 	== 'string') exclude_keys 	= [exclude_keys]

			if(exclude_keys) keys = keys.filter(function(key){ return exclude_keys.indexOf(key) == -1 })

			keys.forEach(function(key){ result = result.concat(obj[key]) })

			return result
		}
	}
])

.filter('preventLoop', [
	function(){
		var cache = []

		window.setInterval( () => { while(cache.length) cache.pop() }, 10_000)

		return function(array){	

			var json		= JSON.stringify(array),
				cache_item 	= cache.filter(function(cache_item){ return cache_item.j == json })[0]

			if(!cache_item){
				cache_item = {j: json, a: array}
				cache.push(cache_item )
			}

			return cache_item.a
		}
	}
])

.filter('mapToKey',[
	function(){
		return function(array, key){	
			return 	array
					?	array.map(function(value){ return value[key] })
					:	null
		}
	}
])

.filter('mapExpression', [

	function(){

		return function(array, expression, scope){
			if(!array) return null
			return array.map( x => scope.$eval(expression, {x}) )
		}

	}

])


.filter('some',[

	function(){
		return function(array){
			if(!array) return false
			return array.some( x => !!x)
		}
	}

])

.filter('filterByKey',[
	function(){
		return function(array, key, values){	

			values = 	Array.isArray(values)
						?	values
						:	[values]

			return 	array
					?	array.filter( x => values.includes(x[key]))
					:	null
		}
	}
])


.filter('sortByKey',[
	function(){
		return function(array, key, values, reverse){	

			values = 	Array.isArray(values)
						?	values
						:	[values]

			if(!array) return null

			array.sort( (a,b) => {

				aIn = values.includes(a[key])
				bIn = values.includes(b[key])

				if(aIn == bIn) 	return  0
				if(aIn)			return  1
				if(bIn)			return -1

			})
			
			return array
		}
	}
])


.filter('flat',[
	function(){
		return function(array){	
			return 	array
					?	array.flat()
					:	null
		}
	}
])


.filter('markdown', [
	function(){
		return function(str, noWrappingP){

			const html = marked.parse(str||'')

			return 	noWrappingP
					?	html.replace(/(^\s*<p>|<\/p>\s*$)/g, '')
					:	html
		}	
	}
])

.filter('isValidDate', [
	function() {
		return function(d) {

			if(! (d instanceof Date) ) 	return false
			if( isNaN(d.getTime()))		return false

			return true	
		}
	}
])



//debug

.filter('consoleLog', [
	function(){
		return function(x, prefix){
			prefix
			?	console.log(prefix, x)
			:	console.log(x)
			return x
		}
	}
])


.filter('consoleDir', [
	function(){
		return function(x){
			console.dir(x)
			return x
		}
	}
])


.filter('onScreen', function(){
	return function(x){
		var element = angular.element(document.getElementById('on-screen-debug-window') || angular.element("<div id =\"on-screen-debug-window\"></div>")),
			log		= angular.element('<pre>'+x+'</pre>'),
			body	= angular.element(document.getElementsByTagName('body'))

		body.append(element)

		element.css({
			boxSizing:	'border-box',
			padding:	'1rem',
			position:	'fixed',
			bottom:		'0',
			height:		'40%',
			width:		'100%',
			opacity:	'0.8',
			overflowY:	'scroll',
			zIndex:		'100',
			background:	'#fff',
			minHeight: 	'2rem',
			minWidth:	'10rem',
			border:		'0.5rem solid #000'

		})
		element.append(log)
		return x
	}
})

