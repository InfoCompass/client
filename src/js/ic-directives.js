"use strict";


angular.module('icDirectives', [
	'pascalprecht.translate',
	'icServices'
])


// Layout directives:

.directive('icHeader',[

	'ic',

	function(ic){
		return {
			restrict: 		"AE",
			templateUrl:	"partials/ic-header.html",
			scope:			{},

			link: 			function(scope){ scope.ic = ic }
		}
	}
])


.directive('icMainContent',[

	'ic',

	function(ic){
		return {
			restrict: 		"AE",
			templateUrl:	"partials/ic-main-content.html",
			scope:			{},

			link: 			function(scope){ scope.ic = ic }
		}
	}
])


.directive('icLoadingScreen',[
	'ic',
	function(ic, $rootScope){
		return {
			restrict: 		"E",
			//templateUrl:	"partials/ic-loading-screen.html",
			scope:			{},

			link: function(scope, element){ 
				scope.ic = ic 
			}
		}
	}
])


.directive('icConsent',[
	'icConsent',

	function(icConsent){
		return {
			restrict:		"AE",

			//inline template required, because this directive will be rednered before plTemplates is done
			template:		` 
								<form ng-if = "confirmationRequired">

									<h1>{{'INTERFACE.CONSENT_HEADING' | translate}}</h1>

									<ul >

										<li  
											ng-repeat 	= "case in cases"
											class		= "confirmation-case"
											ng-class	= "{'consent-refused': !result[case.key]}"
										>
											<div>
												<div>
													{{'CONTENT.CONSENT_%s' | fill: case.key | translate }}

													<span ng-if = "case.server" class ="server">({{case.server}})</span>
												</div>

												<div>
													<ic-toggle
														on		= "{{'INTERFACE.CONSENT_ON'		| translate}}"
														off		= "{{'INTERFACE.CONSENT_OFF'	| translate}}"
														value 	= "result[case.key]"
													></ic-toggle>
												</div>
											</div>

											<p class = "description">	
												{{'CONTENT.CONSENT_%s_DESCRIPTION' | fill : case.key | translate }}
											</p>

										</li>

										<li ng-if = "cases.length > 1">
											<div>
												<div>
													{{'INTERFACE.CONSENT_ALL'| translate}}
												</div>
												<div>
													<ic-toggle
														on			= "{{'INTERFACE.CONSENT_ON'		| translate}}"
														off			= "{{'INTERFACE.CONSENT_OFF'	| translate}}"
														value 		= "confirm.all"
														ng-disabled	= "confirm.all"
													></ic-toggle>
												</div>
											</div>
										</li>
									</ul>


									<div class = "buttons">

										<button 
											type		= "submit"
											ng-click 	= "deny()"
											class		= "active padding border-3"
										>
											{{'INTERFACE.CONSENT_NONE'| translate}}
										</button>

										<button 
											ng-if		= "confirm.some"
											ng-click	= "okay()"											
											class		= "active padding border-3"
										>
											{{'INTERFACE.CONSENT_SOME'| translate}}
										</button>

										<button 
											type		= "submit"
											ng-if		= "confirm.all"
											ng-click	= "okay()"																						
											class		= "active padding border-3"
										>
											{{(cases.length ==1 ? 'INTERFACE.CONSENT_ONE':'INTERFACE.CONSENT_ALL') | translate}}
										</button>


									</div>

								</form>
							`,
			scope:			{},

			link: function(scope){

				scope.cases 		= 	icConsent.cases
				scope.result 		= 	{}
				scope.confirm		= 	{
											none:	undefined,
											all: 	undefined,
											some:	undefined
										}

				scope.cases.forEach( consent_case => scope.result[consent_case.key] = !!consent_case.default )

				icConsent.confirmationRequired
				?	scope.confirmationRequired = true
				:	icConsent.done()
				

				scope.okay = function(){
					Object.entries(scope.result).forEach( ([key, value]) => icConsent.set(key, value) )
					icConsent.done() 
				}

				scope.deny = function(){
					Object.keys(scope.result).forEach( key => icConsent.set(key, false) )
					icConsent.done() 

				}

				scope.$watch(() => scope.confirm, function(){									
					scope.confirm.some	= !scope.confirm.all && !scope.confirm.none	
				}, true)

				scope.$watch( () => scope.confirm.none, function(){
					if(!scope.confirm.none) return null
					
					Object.keys(scope.result).forEach( key => scope.result[key] = false )
					scope.confirm.all = false

				})

				scope.$watch( () => scope.confirm.all, function(){
					if(!scope.confirm.all)	return null
					
					Object.keys(scope.result).forEach( key => scope.result[key] = true )
					scope.confirm.none = false
				})


				scope.$watch( () => scope.result, function(){
					scope.confirm.all	= Object.keys(scope.result).every( key => scope.result[key])
					scope.confirm.none	= Object.keys(scope.result).every( key => !scope.result[key])					
					scope.confirm.some	= !scope.confirm.all && !scope.confirm.none
				}, true)

			}
		}
	}
])

// Section directives:


.directive('icPage', [
	'ic',

	function(ic){
		return {
			restrict:		'E',
			scope:			{},

			link: function(scope, element){
				scope.ic = ic
			}
		}
	}

])
// Start with just the view, edit can be a different directive, maybe utilize switch


//Todo Filter für item links bauen ?
.directive('icSearchResultList', [

	'ic',

	function(ic){
		return 	{
			restrict:		'E',
			templateUrl:	'partials/ic-search-result-list.html',
			scope:			{},

			link: function(scope){
				scope.ic = ic
			}
		}
	}	
])


.directive('icItemPreview',[

	'ic',
	'icTaxonomy',

	function(ic, icTaxonomy){
		return {

			restrict: 		'AE',
			templateUrl: 	'partials/ic-item-preview.html',
			scope:			{
								icItem:	"<",
							},

			link: function(scope, element, attrs){
				scope.ic = ic
			}
		}
	}
])

.directive('icItemBadge', [

	'ic',
	'icTaxonomy',

	function(ic, icTaxonomy){
		return {

			restrict: 		'AE',
			templateUrl: 	'partials/ic-item-badge.html',
			scope:			{
								icItem:	"<",
							},

			link: function(scope, element, attrs){
				scope.ic = ic
			}
		}
	}
])


.directive('icItemFullFooter',[
	'ic',

	function(ic){
		return {
			restrict:		'AE',
			templateUrl:	'partials/ic-item-full-footer.html',
			scope:			{
								icItem: '<'
							},

			link: function(scope, element, attr){
				scope.ic = ic
			}
		}
	}

])

.directive('icItemFullHeader',[
	'icOverlays',
	'icSite',
	'icItemStorage',
	'icItemEdits',
	'icUser',
	'ic',
	'$q',

	function(icOverlays, icSite, icItemStorage, icItemEdits, icUser, ic, $q){
		return {
			restrict:		'AE',
			templateUrl:	'partials/ic-item-full-header.html',
			scope:			true,

			link: function(scope, element, attr){

				scope.ic = ic

				scope.showTools = true
				
				scope.delete = function(){
					icOverlays.open('confirmationModal', 'INTERFACE.DELETE_ITEM_CONFIRMATION')
					.then(function(){
						return 	$q.when(icSite.activeItem.delete())
								.then(
									function(){
										icItemStorage
										.removeItem(icSite.activeItem)
										.refreshFilteredList()

										icItemEdits
										.clear(icSite.activeItem)

										icSite.activeItem = undefined
										icOverlays.open('popup', 'INTERFACE.DELETE_ITEM_SUCCESSFUL')
									},
									function(){
										icOverlays.open('popup', 'INTERFACE.DELETE_ITEM_FAILED')
									}
								)
					})
				}

				scope.cancel = function(){
					scope.$parent.$parent.$broadcast('cancel')
				}

				scope.submit = function(){
					scope.$parent.$parent.$broadcast('submit')
				}

			}
		}
	}
])

.directive('icItemFull',[

	'ic',
	'icSite',
	'icOverlays',
	'icItemStorage',
	'icItemEdits',
	'icAdmin',
	'$q',

	function(ic, icSite, icOverlays, icItemStorage, icItemEdits, icAdmin, $q){

		return {
			restrict:		'AE',
			templateUrl:	'partials/ic-item-full.html',
			scope:			{},

			link: function(scope, element, attrs){
				scope.ic 	= ic

				scope.voiceReader = { show: false}

				scope.updateVoiceReader = function() {
					if(scope.voiceReader.show == true) return;

					const audio = element[0].querySelector('#voice-reader')

					scope.voiceReader.audio = audio
					
					audio && audio.pause()
				}

				scope.$watch( 
					() 		=> icSite.activeItem, 
					(item) 	=> scope.item = item
				)

				scope.$watch(
					() => scope.voiceReader.show,
					() => scope.updateVoiceReader()
				)
			
			}
		}
	}
])

.directive('icItemFullEdit',[

	'ic',
	'icUser',
	'icItemEdits',
	'icItemConfig',
	'icSite',
	'icLanguages',
	'icItemStorage',
	'icTaxonomy',
	'icOverlays',
	'icMainMap',
	'icConfig',
	'icAutoFill',
	'$rootScope',
	'$q',

	function(ic, icUser, icItemEdits, icItemConfig, icSite, icLanguages, icItemStorage, icTaxonomy, icOverlays, icMainMap, icConfig, icAutoFill, $rootScope, $q){

		return {
			restrict:		'AE',
			templateUrl:	'partials/ic-item-full-edit.html',
			scope:			true,

			link: function(scope, element, attrs, controller){

				scope.ic = ic

				scope.show 		= 	{ details: false }
				scope.autofill	=	{}

				const sConfig = icConfig.suggestions

				if(sConfig){
					scope.suggestionMeta 		= {mail:'', 	name:'', 	apiKey:''}	
					scope.suggestionMetaErrors 	= {mail:null, 	name:null, 	apiKey:null}


					controller.registerValidationFunction( () => scope.validateSuggestionMeta() )
				}

				scope.require = function(key){

					const is_new		= 	icSite.activeItem && icSite.activeItem.internal && icSite.activeItem.internal.new

					if(key == 'name')	return	is_new
												?	sConfig && ['new', 'both', true].includes(sConfig.requireName)
												:	sConfig && ['edit', 'both', true].includes(sConfig.requireName)

					if(key == 'mail')	return	is_new
												?	sConfig && ['new', 'both', true].includes(sConfig.requireMail)
												:	sConfig && ['edit', 'both', true].includes(sConfig.requireMail)

					if(key == 'apiKey')	return	is_new
												?	sConfig && ['new', 'both', true].includes(sConfig.requireApiKey)
												:	sConfig && ['edit', 'both', true].includes(sConfig.requireApiKey)

					//TODO, maybe add properties...
				}

				scope.validateSuggestionMeta = function(key){

					if(icUser.can('edit_items')) return false

					
					if(!key || key == 'name'){
						scope.suggestionMetaErrors.name 	= 	scope.require('name') && !scope.suggestionMeta.name.trim()
																?	{code: 'MISSING'}
																:	null
					}

					if(!key || key == 'mail'){
						scope.suggestionMetaErrors.mail 	= 	scope.suggestionMeta.mail
																?	(
																		scope.suggestionMeta.mail.match(/.+@.+\..+/)
																 		?	null
																 		:	{code: 'INVALID_OR_MISSING'}
																 	)
																:	(
																		scope.require('mail')
																		?	{code: 'INVALID_OR_MISSING'}
																		:	null									
																	)	

					}

					if(!key || key == 'apiKey'){
						scope.suggestionMetaErrors.apiKey 	= 	scope.require('apiKey')  && !scope.suggestionMeta.apiKey.trim()
																?	{code: 'MISSING'}
																:	null																
					}

					return Object.values(scope.suggestionMetaErrors).some(x => x)						

				}

				scope.validate = function(){
					//each validate function can return errors
					//every one of them has to be executed, so errors can be marked correctly in the template, do not use .some or .every here
					return !scope.validationFunctions.filter(function(fn){return fn() })[0]
				}

				scope.revertAll = function(){
					scope.icEdit.importData(scope.icItem.exportData())
				}


				scope.pickCoordinates = function(){

					icMainMap.pickCoordinates(scope.icEdit)
					.then(function(result){
						if(result.latitude && result.longitude){
							scope.icEdit.latitude 	= result.latitude
							scope.icEdit.longitude 	= result.longitude 
						}
					})
					.catch(function(){})


				}

				/* This function also appears in icItemFullHeader, which is not that elegeant =/ */
				scope.cancel = function(){
					var message = "INTERFACE.CONFIRM_CANCEL_EDIT"

					if(icSite.activeItem.internal.new &&  icUser.can('edit_items')) 	message = "INTERFACE.CONFIRM_CANCEL_ITEM_CREATION"
					if(icSite.activeItem.internal.new && !icUser.can('edit_items')) 	message = "INTERFACE.CONFIRM_CANCEL_ITEM_SUGGESTION"

					icOverlays.open('confirmationModal', message)
					.then(function(){
						if(icSite.activeItem.internal.new) icSite.activeItem = undefined
						icSite.editItem = false
					})
				}

				scope.focusEditingNote = function(){
					element[0].querySelector('[ic-key=editingNote] input, [ic-key=editingNote] textarea')?.focus()
				}

				scope.submit = function(ignore_missing_note){

					if(!scope.icEdit) return null				

					var item 		= scope.icItem,
						edit 		= scope.icEdit


					icAutoFill.storeValues()

					icOverlays.toggle('spinner', true)


					if(!icUser.can('edit_items')){

						if(!scope.validate()) 	return 	icOverlays.open('popup', 'INTERFACE.EDIT_ERRORS')	


						if(!edit.editingNote && !ignore_missing_note) 

												return 	icOverlays.open('confirmationModal', 'INTERFACE.MISSING_EDITING_NOTE')	
														.then( 
															() => scope.submit(true),
															() => scope.focusEditingNote() 
														)


						//suggesting new item
						if(item.internal.new){
							
							return 	$q.when(edit.submitAsNew(scope.suggestionMeta))
									.then(
										function(){
											icItemEdits.clear(edit)
											icItemStorage.removeItem(item)

											icSite.activeItem 	= null
											icSite.editItem 	= false

											icSite.updateUrl()

											return icOverlays.open('popup', 'INTERFACE.SUGGESTION_SUCCESSFUL')
										},
										function(){
											return icOverlays.open('popup', 'INTERFACE.SUGGESTION_FAILED')
										}
									)
						}

						//suggesting edit 
						if(!item.internal.new){
						
							return 	$q.when(edit.submitAsEditSuggestion(item, scope.suggestionMeta))
									.then(
										function(){
											icItemEdits.clear(edit)

											icSite.editItem = false
											icSite.updateUrl()

											return icOverlays.open('popup', 'INTERFACE.SUGGESTION_SUCCESSFUL')
										},
										function(){
											return icOverlays.open('popup', 'INTERFACE.SUGGESTION_FAILED')
										}
									)
						}

					}

					//adding new item
					if(item.internal.new && icUser.can('edit_items')){
						if(!scope.validate()) return icOverlays.open('popup', 'INTERFACE.EDIT_ERRORS')	
						return 	$q.when(edit.submitAsNew())
								.then(
									function(item_data){
										item.internal.new = false
										item.id = item_data.id

										icItemEdits.clear(edit)

										icItemStorage.storeItem(item_data)
										icItemStorage.refreshFilteredList()

										icSite.editItem 	= false
										icSite.updateUrl()

										return icOverlays.open('popup', 'INTERFACE.ITEM_CREATION_SUCCESSFUL')
									},
									function(){
										return icOverlays.open('popup', 'INTERFACE.ITEM_CREATION_FAILED')
									}
								)
					}

					return	$q.when(edit.update())
							.then(
								function(item_data){

									icItemEdits.clear(edit)

									icItemStorage.storeItem(item_data)
									icItemStorage.refreshFilteredList()

									icSite.editItem = false
									icSite.updateUrl()


									return icOverlays.open('popup', 'INTERFACE.UPDATE_SUCCESSFUL')
								},
								function(){
									return icOverlays.open('popup', 'INTERFACE.UPDATE_FAILED')
								}
							)

				}

				scope.$watch(
					function(){
						return icSite.activeItem
					},
					function(item){
						scope.icItem = item
						scope.icEdit = icItemEdits.get(item)
					}
				) 

				function removeTagFromEdit(tag){

					if(!scope.icEdit.tags) return null

					var pos = scope.icEdit.tags.indexOf(tag)

					if(pos != -1) scope.icEdit.tags.splice(pos,1)
				}

				scope.$on('cancel', function(){
					scope.cancel()
				})

				scope.$on('submit', function(){
					scope.submit()
				})



				// keep tags and taxonomy consistency
				scope.$watch('icEdit.tags', function(){

					if(!scope.icEdit) return null

					// make sure there is only one type:
					var type 		= icTaxonomy.getType(scope.icEdit.tags)

					icTaxonomy.types.forEach(function(tag){ if(tag != (type && type.name)) removeTagFromEdit(tag) })

					icTaxonomy.categories.forEach(function(c){ 	
						if(scope.icEdit.tags && scope.icEdit.tags.indexOf(c.name) == -1) c.tags.forEach(removeTagFromEdit)
					})


					//LOR

					icTaxonomy.lor.forEach( district => {

						if(scope.icEdit.tags && scope.icEdit.tags.indexOf(district.tag) == -1){
							district.pgr
							.map(pgr => pgr.tag)
							.forEach(removeTagFromEdit)	
						}

						district.pgr.forEach( pgr => {
							if(scope.icEdit.tags && scope.icEdit.tags.indexOf(pgr.tag) == -1){
								pgr.bzr
								.map( bzr => bzr.tag)
								.forEach(removeTagFromEdit)
							}
						})
					})

				},
				true)
			
			},

			controller: [ '$scope', '$element',  function($scope, $element){
				$scope.validationFunctions = $scope.validationFunctions || []
				
				this.registerValidationFunction = function(fn, remoteScope){

					$scope.validationFunctions.push(fn)
					remoteScope && remoteScope.$on('$destroy', function(){
						$scope.validationFunctions = $scope.validationFunctions.filter(function(f){ return f != fn })
					})

				}
				

			}]
		}
	}
])

.directive('icItemProposals',[

	'ic',
	'icItemConfig',
	'icItemEdits',
	'icItemStorage',
	'icOverlays', 
	'icLanguages',


	function(ic, icItemConfig, icItemEdits, icItemStorage, icOverlays, icLanguages){

		return {
			restrict: 		'AE',
			templateUrl:	'partials/ic-item-proposals.html',
			scope:			{
								icItem: '<',
							},


			link: function(scope, element, attrs){

				scope.ic = ic			

				scope.getLanguages = function(proposal){

					const translatableProperties = 	icItemConfig.properties
													.filter( 	property => property.translatable)
													.map(		property => property.name)

					const languages = new Set()
					
					translatableProperties.forEach( property_name => {

						if(!(property_name in proposal)) return null
						
						Object.keys(proposal[property_name])
						.forEach( lang => languages.add(lang) )						

					})

					return Array.from(languages)

				}

				scope.applyAll = function(proposal, lang){

					if(!scope.icEdit) return null

					icItemConfig.properties
					.forEach( property => {

						if(!(property.name in proposal) ) 	return null
						if(property.internal)				return null


						if(property.name == 'state')		return null
						if(property.name == 'editingNote')	return null

						const value = proposal[property.name]		

						if(value === undefined) return null
						if(value === null)		return null

						if(property.translatable){

							if(typeof value[lang] != 'string') return null

							scope.icEdit[property.name]			= scope.icEdit[property.name] || {}
							scope.icEdit[property.name][lang] 	= value[lang]
							return;
						}


						scope.icEdit[property.name] = angular.copy(proposal[property.name])
					})

				}

				scope.delete = function(proposal){

					return	icOverlays.open('confirmationModal', 'INTERFACE.PROPOSAL_CONFIRM_DELETE')
							.then( () 		=> icItemStorage.getIsolatedItem({id:proposal.id}))
							.then( tempItem => tempItem.delete() )
							.then( () 		=> scope.icItem.proposals = scope.icItem.proposals.filter( p => p != proposal))
							.then( console.log, console.warn)	
				}

				scope.diff = function(proposal, lang){

					if(!scope.icEdit) return true


					return	icItemConfig.properties
							.some( property => {

								if(!(property.name in proposal) ) 	return false
								if(property.internal)				return false
								if(property.name == 'state')		return false
								if(property.name == 'editingNote')	return false

								const value = proposal[property.name]		
								
								if(scope.icEdit.diff(property.name, value, lang)){
									return true
								}

							})

				}

				scope.showPreview = function(proposal){

				}


				scope.$watch('icItem', function(a, b){

					if(!scope.icItem) return null

					scope.icEdit = icItemEdits.get(scope.icItem.id)

				})

			}
		}

	}

])

.directive('icItemProposalPreview',[

	'ic',
	'icItemConfig',
	'icTaxonomy',
	'icSite',

	function(ic, icItemConfig, icTaxonomy, icSite){
		return 	{
			restrict:		'AE',
			templateUrl:	'partials/ic-item-proposal-preview.html',
			scope:			{
								icProposal:	'<',
								icItem:		'<'
							},


			link: function(scope, element){

				scope.ic = ic

				function update(){

					scope.properties 	=	[...icItemConfig.properties]
											.filter( property => {
												const value = scope.icProposal[property.name]

												if(property.name == 'state')	return false	
												if(property.internal)			return false											
												if(value == undefined) 			return false
												if(value == null)				return false

												if(!scope.icItem.diff(property.name, scope.icProposal[property.name], icSite.currentLanguage)) return false

												return true	
											})

					scope.properties.sort( (p1, p2) => {

						if(p1.name == 'editingNote') return -1
						if(p2.name == 'editingNote') return  1

						if(p1.name == 'title') return -1
						if(p2.name == 'title') return  1

						
						if(p1.translatable)	return -1
						if(p2.translatable)	return 1

						return icItemConfig.properties.indexOf(p1)	> icItemConfig.properties.indexOf(p2)

					})
				}

				function arrayDiff(a,b){
					if(!Array.isArray(a)) 				return true
					if(!Array.isArray(b)) 				return true

					if(a.length != b.length)			return true

					if(a.some( x => !b.includes(x) ))	return true
					if(b.some( x => !a.includes(x) ))	return true	

					return false

				}

				scope.categoryDiff = function(){

					if(!Array.isArray(scope.icItem.tags)) 		return true
					if(!Array.isArray(scope.icProposal.tags))	return true

					const categories 	= icTaxonomy.getCategories(scope.icItem.tags)
					const proposed		= icTaxonomy.getCategories(scope.icProposal.tags)

					return arrayDiff(categories, proposed)

				}

				scope.subCategoryDiff = function(){

					if(!Array.isArray(scope.icItem.tags)) 		return true
					if(!Array.isArray(scope.icProposal.tags))	return true

					const categories 	= icTaxonomy.getSubCategories(scope.icItem.tags)
					const proposed		= icTaxonomy.getSubCategories(scope.icProposal.tags)

					//console.log(categories, proposed, arrayDiff(categories, proposed))

					return arrayDiff(categories, proposed)

				}

				scope.tagGroupDiff = function(tagGroup){


					if(!Array.isArray(scope.icItem.tags)) 		return true
					if(!Array.isArray(scope.icProposal.tags))	return true

					const values 		= icTaxonomy.getUnsortedTags(scope.icItem.tags, tagGroup)
					const proposed		= icTaxonomy.getUnsortedTags(scope.icProposal.tags, tagGroup)

					//console.log(tagGroup, values, proposed, arrayDiff(values, proposed))

					return arrayDiff(values, proposed)

				}

				scope.$watch( () => scope.icProposal, 		update)
				scope.$watch( () => scope.icItem, 			update)
				scope.$watch( () => icSite.currentLanguage,	update)

			}
		}
	}
])


.directive('icItemPropertyEdit', [

	'icSite',
	'icItemEdits',
	'icItemConfig',
	'ic',
	'$q',
	'$parse',

	function(icSite, icItemEdits, icItemConfig, ic, $q, $parse){
		return {
			restrict:		'AE',
			require:		['^^icItemFullEdit'],
			scope:			{
								icItem:					"<",
								icKey:					"@",
								icType:					"@",

								icTranslationKey:		"@?",
								icOptions:				"<?",
								icOptionsItemRef:		"<?",
								icOptionFilterKey:		"&?",
								icOptionsFilterLimit:	"<?",
								icOptionLabel:			"&?",
								icOptionIconClass:		"&?",
								icLeadingOption:		"<?",
								icCheckAll:				"<?",
								icCheckNone:			"<?",
								icForceChoice:			"<?",
								icDate:					"<?",
								icSkipTime:				"<?",
								icActivate:				"@",
								icToggleOn:				"@",
								icToggleOff:			"@"
							},

			templateUrl: 	function(tElement, tAttrs){

								if(tAttrs.icOptions)	return "partials/ic-item-property-edit-options.html"
								if(tAttrs.icDate)		return "partials/ic-item-property-edit-date.html"

								return "partials/ic-item-property-edit-simple-value.html"

							},

			link: function(scope, element, attrs, ctrls){

				scope.ic				=	ic
				scope.value				=	{
												edit: 		undefined,
												current: 	undefined
											}

				scope.date				=	{
												date_enabled:	false,
												time_enabled:	false,
											}

				scope.icProperty		=	icItemConfig.properties.find( property => property.name == scope.icKey )

				scope.filter			=	{
												str:		'',
											}
				
				if(!scope.icProperty){
					console.log('icItemPropertyEdit: unknown property.', scope.icKey)
					return null
				}

				if(scope.icOptions === true){
					scope.icOptions	 =	scope.icProperty.options
				}

				scope.icAllowMultipleChoices = scope.icAllowMultipleChoices || false


				scope.icTranslatable 			= attrs.icTranslatable 			? $parse(attrs.icTranslatable)() 			: false
				scope.icHideErrors				= attrs.icHideErrors			? $parse(attrs.icHideErrors)()				: false
				scope.icAllowMultipleChoices	= attrs.icAllowMultipleChoices	? $parse(attrs.icAllowMultipleChoices)()	: false


				function copyOptions(array){

					if(!array) return undefined
					if(!array.forEach) array = [array]


					var matching_options = 	scope.icOptions
											?	scope.icOptions.filter( option => array.includes(option) )
											:	[]

					return 	scope.icType == 'array'
							?	matching_options
							:	matching_options[0]
				}


				function updateDateData(){
					if(!scope.value.edit || typeof scope.value.edit != 'string'){
						scope.date = 	{
											date:			null,
											time:			null,
											date_enabled:	false,
											time_enabled:	false,
										}
						return null
					}

					var matches = scope.value.edit.match(/^(\d\d\d\d\-\d\d\-\d\d)($|T(\d\d\:\d\d))/)


					if(!matches) return null

					scope.date.date_enabled = true
					scope.date.date			= new Date(matches[1])

					if(scope.icSkipTime) return null					

					scope.date.time_enabled = !!matches[3]


					if(scope.date.time_enabled){
						scope.date.time		= new Date("1970-01-01T"+matches[3]+":00.000Z")
					}
				}


				scope.$watch('icItem', function(a, b){


					if(!scope.icItem) return null
					if(scope.icItem.remoteItem) return null

					scope.icEdit = scope.icItem && icItemEdits.get(scope.icItem.id)


					// check coherence:
					if(scope.icEdit && !scope.icKey in scope.icEdit ){
						console.warn('icItemPropertyEdit: unknown property: ', scope.icKey)
						return null
					}


					if(scope.icItem.internal.new){
						scope.hideCurrentValue = true
					}

					scope.untouched		= 	true
					scope.error			=	null


					scope.refreshProposals()
				})


				scope.$watch('icItem.proposals', () => scope.refreshProposals())	

				scope.getValueFromItem = function( item ){

					if(scope.icOptions) 		return copyOptions(item[scope.icKey])
						
					if(scope.icTranslatable) 	return angular.copy(item[scope.icKey][icSite.currentLanguage])
					
					return angular.copy(item[scope.icKey])

				}


				// update local value, when the original changes (most likely because it finshed downloading, i.e. after storing to the backend)
				scope.$watch(
					function(){
						return scope.icItem && scope.icItem[scope.icKey]
					},

					function(v){

						if(!scope.icItem || !scope.icEdit) return null

						scope.value.current = scope.getValueFromItem(scope.icItem)

						//reset local edit value, if it was undefined. Should only happen when the property is edited for the first time:
						if(scope.value.edit === undefined) scope.value.edit = angular.copy(scope.value.current)

					},
					true
				)

				// update local value, when the edit changes (most likely a different property changed the current one depends on)
				scope.$watch(
					function(){
						return scope.icEdit && scope.icEdit[scope.icKey]
					},

					function(v){

						if(!scope.icItem || !scope.icEdit) return null
						

						scope.value.edit = 	scope.getValueFromItem(scope.icEdit)

					},
					true
				)


				scope.$watch(
					function(){
						return scope.icOptions
					},

					function(v){

						if(!scope.icItem || !scope.icEdit) return null

						if(!scope.icOptions) return null

						if(scope.icOptions === true){
							scope.icOptions = scope.icProperty.options
						}

						scope.value.edit 	= copyOptions(scope.icEdit[scope.icKey])
						scope.value.current	= copyOptions(scope.icItem[scope.icKey])

						// maybe check if touched before
						//scope.validate()
					},
					true
				)


				// update local value, if it is translatable, when current language changes:
				scope.$watch(
					function(){
						return icSite.currentLanguage
					},
					function(a,b){
						if(!scope.icItem || !scope.icEdit) return null

						if( a!=b && scope.icTranslatable){
							scope.value.edit 	= angular.copy(scope.icEdit[scope.icKey][icSite.currentLanguage])
							scope.value.current = angular.copy(scope.icItem[scope.icKey][icSite.currentLanguage])
						}

						scope.refreshProposals()
					}
				)




				// update global edit and check for errors, when local edit changes
				scope.$watch('value.edit', function(){

					if(!scope.icItem || !scope.icEdit) return null

					if(scope.icProperty.type == 'number'){
						scope.value.edit = 	String(scope.value.edit)
											.replace(/,/, '.')
											.replace(/[^0-9\.\-]/g,'')
											.replace(/\./,'DOT')
											.replace(/\./g,'')
											.replace(/DOT/, '.')
											.replace(/\-/,'MINUS')
											.replace(/\-/g, '')
											.replace(/MINUS/,'-')

						scope.value.edit = 	isNaN(parseFloat(scope.value.edit))
											?	null
											:	scope.value.edit


					}

					if(scope.icTranslatable){
						scope.icEdit[scope.icKey] = scope.icEdit[scope.icKey] || {}
						scope.icEdit[scope.icKey][icSite.currentLanguage] = angular.copy(scope.value.edit)
					} 

					else if(scope.icOptions && scope.icType == 'array') {

						scope.icEdit[scope.icKey] = scope.icEdit[scope.icKey] || []

						scope.icOptions.forEach(function(option){
							var pos_1 = scope.icEdit[scope.icKey].indexOf(option),
								pos_2 = scope.value.edit ? scope.value.edit.indexOf(option) : -1

							if(pos_1 != -1) scope.icEdit[scope.icKey].splice(pos_1, 1)
							if(pos_2 != -1) scope.icEdit[scope.icKey].push(option)
						})

					}

					else {
						scope.icEdit[scope.icKey] 	= angular.copy(scope.value.edit)
					}
					

					if(scope.untouched){
						scope.untouched = false
					} else {
						scope.validate()
					}

					if(scope.icDate) updateDateData()



				}, true)



				function pad(num, size, min, max) {
					if(num === undefined || num === null) return NaN
					num = parseInt(num)

					num = 	min
							?	Math.max(min, num)
							:	num

					num =	max
							?	Math.min(max, num)
							:	num

					var s = String(num);
					while (s.length < size) s = "0" + s;
					return s;
				}


				scope.$watch('date', function(){
					if(!scope.icDate) return null

					if(!scope.date.date_enabled){
						scope.value.edit  = ''
						return null
					}

					if(!(scope.date.date instanceof Date) || isNaN(scope.date.date)) return null


					var date_portion_match 	= scope.date.date.toISOString().match(/^(\d\d\d\d\-\d\d\-\d\d)/),
						date_portion 		= date_portion_match && date_portion_match[1] || ''


					scope.value.edit = 	date_portion

					if(!scope.date.time_enabled) return null

					if(!(scope.date.time instanceof Date) || isNaN(scope.date.time)) return null



					var time_portion_match 	= scope.date.time && scope.date.time.toISOString().match(/T(\d\d\:\d\d)/),
						time_portion 		= time_portion_match && time_portion_match[1] || ''	
					
					scope.value.edit +=	'T' + time_portion

				}, true)





				scope.filteredOptions = function(){					

					if(!scope.icOptionFilterKey) return scope.icOptions || []

					const regex = 	scope.filter.str
									.replace(/[,.;?!]/g,' ')
									.split(/\s/g).map(part =>  new RegExp(part, 'gi'))

					let filtered_options =  	scope.filter.str.length > 1
												?	(scope.icOptions || []).filter( option => {						
														return 	regex.every( rx => scope.icOptionFilterKey({option}).match(rx) )
													})	
												:	[]

					filtered_options = filtered_options.slice(0,scope.icOptionsFilterLimit)							

					if(scope.icAllowMultipleChoices){
						filtered_options.unshift(... scope.value.edit || [])
						filtered_options.unshift(... scope.value.current || [])
					}else {
						scope.value.edit 	&& filtered_options.unshift(scope.value.edit)
						scope.value.current && filtered_options.unshift(scope.value.current)
					}

					filtered_options = filtered_options.filter( (o, index) => filtered_options.indexOf(o) == index )

					return filtered_options

				}

				scope.getOptionLabel = function(option){
					return scope.icOptionLabel({option})
				}

				scope.getOptionSortingPosition = function(option){
					return option == 	scope.icLeadingOption
										?	0
										:	scope.getOptionLabel(option)
				}


				scope.validate = function(){
				
					scope.error 	= 	scope.icForceChoice && !(scope.value.edit && scope.value.edit.length)
										?	{ code: "SELECT_AT_LEAST_ONE_OPTION"	}
										:	scope.icEdit.getErrors(scope.icKey)

					element.toggleClass('invalid', scope.error)
					return scope.error
				}

				ctrls.forEach(function(ctrl){ ctrl.registerValidationFunction(scope.validate, scope)	})


				scope.revert = function(){
					scope.value.edit = angular.copy(scope.value.current)
					if(scope.icDate) updateDateData()
				}

				scope.diff = function(counterpart, counterpart_may_be_undefined, alternative_base_value){		

					if(counterpart === undefined && !counterpart_may_be_undefined) counterpart = scope.value.current

					let base_value =	alternative_base_value === undefined
										?	scope.value.edit
										:	alternative_base_value	 	

					switch(scope.icType){
						case "string": 	return 	typeof(counterpart) == 'string'
												?	base_value != counterpart
												:	!(
														(
																base_value === null
															||	base_value === undefined
															||	base_value === ""
														)
														&&
														(
																counterpart === null
															||	counterpart === undefined
														)
													)
													&& String(base_value) != String(counterpart)
										break;
						
						case "text": 	return 	(base_value && base_value.trim()) != (counterpart && counterpart.trim()) 
										break;
						
						case "array": 	return 		!counterpart
												||	!base_value
												||	(counterpart.length != base_value.length)
												||	counterpart.some( option => !base_value.includes(option) )
												||	base_value.some( option => !counterpart.includes(option) )
										break;
					}
				}

	
				scope.toggleOption = function(option, state){


					if(scope.icType == 'string'){

						const add_option 	=	typeof state == 'boolean'
												?	state
												:	scope.value.edit != option 

						scope.value.edit 	= 	add_option
												?	option 
												:	undefined

						return undefined
					}


					if(!option){

						const add_options 	= 	typeof state == 'boolean'
												?	state
												:	(scope.value.edit.length != scope.icOptions.length )

						scope.value.edit	= 	add_options
												?	copyOptions(scope.icOptions)
												:	[]
						return undefined					
					}

					var pos = scope.value.edit.indexOf(option)

					pos == -1 
					?	(state === false) 	|| scope.value.edit.push(option)
					:	(state === true)	|| scope.value.edit.splice(pos,1)	


					if(!scope.icAllowMultipleChoices){
						scope.value.edit = 	scope.value.edit.filter(function(entry){
												return scope.icOptions.indexOf(entry) == -1 || entry == option
											})
					}

				}

				//checkAll:

				scope.check	= { all : false }

				scope.updateCheckAll = function(){
					if(!scope.value)		return null
					if(!scope.value.edit)	return null
					if(!scope.icOptions)	return null

					scope.check.all = scope.value.edit.length == scope.icOptions.length
				}


				scope.$watch('value.edit.length', 	() => scope.updateCheckAll())
				scope.$watch('icOptions.length', 	() => scope.updateCheckAll())

				//proposals:

				scope.$watch('value.current', () => scope.refreshProposals() )

				scope.showProposals = false

				scope.updateEditWithProposal = function(proposal){
					scope.value.edit = scope.getValueFromItem(proposal)
				}

				scope.editMatchesProposal = function(proposal){

					return 		!scope.diff(scope.getValueFromItem(proposal), true)
							&&	scope.isApplicable(proposal)
				}

				scope.currentMatchesProposal = function(proposal){

					return 		!scope.diff(scope.getValueFromItem(proposal), false, scope.value.current)
							&&	scope.isApplicable(proposal)
				}

				scope.isApplicable = function(proposal){
					if( 

							scope.icType == 'string'
						&&	scope.icOptions
						&&	scope.getValueFromItem(proposal) == undefined 

					) return false


					return true

				}

				scope.refreshProposals = function(){

					scope.otherLanguages	= 	[]				

					scope.proposals		=	(	
												['state', 'editingNote'].includes(scope.icKey) 
												?	[]
												:	scope.icItem && scope.icItem.proposals || []
											)
											.filter( proposal => proposal[scope.icKey] !== undefined)
											.map( (proposal, index) => ({...proposal, index}))
											.map( proposal => {

												if(scope.icProperty.translatable && proposal[scope.icKey]){

													let otherLanguagesSet = new Set([
																					...	Object.keys(proposal[scope.icKey])
																						.filter( lang => lang != icSite.currentLanguage),
																					...	scope.otherLanguages
																				])
														

													scope.otherLanguages = Array.from(otherLanguagesSet)
												}


												return proposal
											})
											.filter( 
												proposal	=>	scope.icProperty.translatable
																?	typeof proposal[scope.icKey][icSite.currentLanguage] == 'string'
																:	proposal[scope.icKey] 
											)
											.filter(
												proposal	=>	!scope.currentMatchesProposal(proposal)
											)


					scope.showProposals = scope.proposals.length > 0
											
				}

				scope.$watch('value.current', () => scope.refreshProposals() )


			}
		}
	}
])


.directive('icItemProperty', [

	'$sce',
	'ic',
	'icTaxonomy',

	function($sce, ic, icTaxonomy){

		return {
			restrict:		'AE',
			templateUrl:	'partials/ic-item-property.html',
			scope:			{
								icTitle:		"<",
								icContent:		"<",
								icIcon:			"<",
								icLink:			"<",
								icContentLink:	"<",
								icPhone:		"<",
								icLor:			"<"
							},

			link: function(scope, element, attrs){
				
				scope.ic = ic

				scope.$watch('icContent', function(){
					if(typeof scope.icLink == "string"){
						scope.link = scope.icLink + scope.icContent
					}
					if(scope.icPhone){

						const 	matches 	= scope.icContent.match(/(\+?[\d\s-\/]{6,}\d)/g)													
						let		html 		= scope.icContent

						;(matches||[]).forEach( match => {
							console.log('match: ', match)
							const number 	= match.replace(/[-\s\/]/g,'')
							const link		= `<a class = "active" href = "tel:${number}">${match}</a>`
							html = html.replace(match, link)
						})

						console.log(scope.icContent, html)

						scope.phoneNumbers = html
					}
				})

				scope.$watch('icLor', tags => {

					const dst = icTaxonomy.getDistrict(tags)
					const pgr = icTaxonomy.getPrognoseraum(tags)
					const bzr = icTaxonomy.getBezirksregion(tags)


					scope.lor = [dst, pgr, bzr].filter( x => !!x)

				})

				scope.$parent.$watch(attrs.icExtraLinks, function(value){ 
					scope.icExtraLinks 	= 	Array.isArray(value)
											?	value
											:	Object.entries(value||{})
				}, true)

				scope.$parent.$watch(attrs.icExtraLines, function(value){ 
					scope.icExtraLines = 	Array.isArray(value)
											?	value.filter( i => !!i)
											:	[]
				}, true)

			}
		}
	}
])



.directive('icLogoText',[
	function(){
		return {
			templateUrl:	'partials/ic-logo-text.html'
		}
	}
])

.directive('icLogoLine',[
	function(){
		return {
			templateUrl:	'partials/ic-logo-line.html'
		}
	}
])

.directive('icLogoFull',[
	function(){
		return {
			templateUrl:	'partials/ic-logo-full.html'
		}
	}
])

.directive('icLogoPrint',[
	function(){
		return {
			templateUrl:	'partials/ic-logo-print.html'
		}
	}
])


.directive('icMainMenu', [

	'ic',

	function(ic){
		return {
			templateUrl:	'partials/ic-main-menu.html',
			scope:			{
								icPlain:	'<'
							},

			link: function(scope){
				scope.ic = ic
			}

		}
	}
])


.directive('icUserMenu', [

	'ic',

	function(ic){
		return {
			restrict:		'AE',
			templateUrl:	'partials/ic-user-menu.html',
			scope:			{
								icPlain:	'<'
							},

			link: function(scope){
				scope.ic = ic
			}

		}
	}
])

.directive('icListsMenu', [

	function(){
		return {
			templateUrl:	'partials/ic-lists-menu.html',

			link: function(){

			}
		}
	}
])


.directive('icListsItem', [

	function(){
		return {
			templateUrl:	'partials/ic-lists-item.html',

			link: function(){
				
			}
		}
	}
])

.directive('icBreadcrumbs',[
	'$rootScope',
	'icSite',
	'icTaxonomy', 
	'ic',

	function($rootScope, icSite, icTaxonomy, ic){
		return {
			templateUrl:	'partials/ic-breadcrumbs.html',
			scope:			true,

			link: function(scope){
				scope.ic = ic

				$rootScope.$watch(function(){
					scope.category 		= 		icTaxonomy.getCategory(icSite.filterByCategory) 		
											|| 	icTaxonomy.getCategory(icSite.activeItem && icSite.activeItem.tags)

					scope.subCategories	= 		icTaxonomy.getSubCategories(icSite.filterByCategory)	
											|| 	icTaxonomy.getSubCategories(icSite.activeItem && icSite.activeItem.tags)
				})
			}
		}
	}
])

.directive('icSearch',[

	'ic',
	'icSite',

	function(ic, icSite){
		return {
			restrict: 		'E',
			templateUrl:	'partials/ic-search.html',
			scope:			{
								icOnSubmit: 	'&',
								icOnUpdate: 	'&',
								icButtonLabel:	'<',
								icFocus:		'<',
								icMini:			'@'
							},

			link: function(scope, element, attrs){

				scope.ic		= ic

				scope.searchId	= scope.$id

				scope.update = function(search_term){
					var input = element[0].querySelector('input')
					
					search_term = search_term.replace(/[\/?#]+/g,' ')


					input.focus()
					input.blur()

					if(scope.icOnSubmit) scope.icOnSubmit()

					if(search_term.replace(/s+/,'')){

						if(scope.icOnUpdate) scope.icOnUpdate()
						icSite.searchTerm = search_term
						icSite.list = true
						icSite.activeItem = null //TODO
					}

					scope.searchTerm = undefined
				}

			}
		}
	}
])


.directive('icTaxonomyTagList', [

	'ic',
	'icTaxonomy',

	function(ic, icTaxonomy){
		return {
			restrict:		'E',
			templateUrl:	'partials/ic-taxonomy-tag-list.html',
			scope:			{
								icTags: "<"
							},

			link: function(scope, element){
				scope.ic = ic
			}
		}
	}
])
	
.directive('icTaxonomyFilter',[

	'ic',
	'icTaxonomy',

	function(ic, icTaxonomy) {
		return {
			restrict:		'E',
			templateUrl:	'partials/ic-taxonomy-filter.html',

			link: function(scope, element){
				scope.ic 		= 	ic
				scope.expand 	= 	{
										categories: 	true,
										// unsortedTags: 	true
									}
			}
		}
	}
])

.directive('icTaxonomyFilterTagList', [

	'ic',
	'icTaxonomy',

	function(ic, icTaxonomy){
		return {
			restrict:		'E',
			templateUrl:	'partials/ic-taxonomy-filter-tag-list.html',

			link: function(scope, element){
				var displayStyle = false

				scope.ic = ic

				scope.$watch(function(){
					var children = element[0].children

					if(children.length == 0 && displayStyle === false){
						displayStyle = element[0].style.display
						element[0].style.display = 'none'
					}
					if(children.length != 0 && displayStyle !== false){
						element[0].style.display = displayStyle
						displayStyle = false
					}
				})
			}
		}
	}
])

.directive('icSorting', [

	'ic',

	function(ic, icTaxonomy){
		return {
			restrict:		'E',
			templateUrl:	'partials/ic-sorting.html',

			link: function(scope, element){
				scope.ic = ic
			}
		}
	}
])
	





.directive('icOptionsEdit',[

	'icOptions',
	'icItemStorage',

	function(icOptions, icItemStorage){

		return {
			restrict:		'E',
			templateUrl:	'partials/ic-options-edit.html',

			link(scope){


				scope.key 				=	{}
				scope.new_option 		=	{}

				scope.key.value 		=	icOptions.keys[0]

				scope.block				= 	""
				scope.show				= 	{}

				scope.filteredOptions	=	[]

				scope.edits				=	[]


				scope.page				= 	{
												size: 		20,
												current: 	0
											}

				scope.filter			=	{ term: '' }

				scope.logRaw = function(){


					const map = {}

					scope.filteredOptions.forEach( o => {
						map[o.label] = o.tag
					})

				}

				scope.edit = function(option){
					const e = scope.edits.find( o => o.id == option.id)

					if(!e) scope.edits.push(angular.copy(option))

					return e	
				}

				scope.diff = function(option){

					const e = scope.edit(option)


					const diff =		e.label != option.label
									||	e.link	!= option.link
									||	e.tag	!= option.tag


					return diff
				}

				scope.undo = function(option){
					const pos = scope.edits.find( o => o.id == option.id)

					if(pos != -1) scope.edits.splice(pos,1)

					return scope.edit(option)
				}


				scope.numberOfItems = function(option){
					return icItemStorage.data.filter( i => i.tags.includes(option.tag) ).length
				}

				scope.addOption = async function(option){
					icOptions.sanitizeOption(option)

					let o = await icOptions.addOption(option)

					o._just_added = true

					scope.new_option = {key: scope.key.value}

					this.update()

					scope.$digest()


				}

				scope.removeAllRecentlyAdded = function(){
					
					scope.filteredOptions
					.filter( o => o._just_added)
					.forEach( o => scope.removeOption(o))

				}

				scope.addKey = function(key){
					icOptions.addKey(key)
				}


				scope.addBlock = function(data, key){

					if(!key) console.log('Options, addBlock(): No key selected!')

					const lines = 	data.split('\n').map(l => l.trim())
					const rows	= 	lines.map( line => {
										let row = []
										const match = line.match(/^"(.*)"/)

										if(match){
											row.push(match[1])
											line = line.replace(/^"(.*)"/, '')
										} else {
											row.push(line.split(',')[0])
										}

										row.push(line.split(',')[1] || undefined)
										row.push(line.split(',')[2] || undefined)

										return row
									})
					
					const options = []

					rows.forEach( row => {
						let option = 	{
											label: 	(row[0]||'').trim(),
											link:	(row[1]||'').trim(),	
											key						
										}

						if(!option.label) return null

						option.tag = icOptions.generateTag(option)

						icOptions.sanitizeOption(option)				

						if(options.find( o => o.label 	== option.label) ) return null

						let count = 2

						while(options.find( o => o.tag 	== option.tag)){
							option.tag = 	count == 2
											?	option.tag + '_2' 
											:	option.tag.replace(new RegExp(count+'$'), String(count+1) )											
							count++				

						} 

						options.push(option)
					})
					
					options.forEach( option => scope.addOption(option) )

				}

				scope.updateOption = async function(option){

					icOptions.sanitizeOption(option)

					let o = await icOptions.updateOption(option)

					if(option._just_added) o._just_added = true

					scope.update()

					scope.$digest()

				}

				scope.removeOption = async function(option){
					await icOptions.removeOption(option)					
					

					this.update()

					scope.$digest()					

				}

				scope.matchFilter = function(str){

					if(!scope.filter.term) return true

					return	scope.filter.term.split(/s/).every( part => {
								return str.match(new RegExp(part,'i'))
							})
				}

				scope.update = function(){

					scope.filteredOptions =	icOptions.options.filter( o => {
												if(o.key != scope.key.value) return false
												return scope.matchFilter(o.label) || scope.matchFilter(o.tag)
											})				

					scope.filteredOptions.sort( (a,b) => {
						if(!a._just_added || !b._just_added){
							if(a._just_added) return -1
							if(b._just_added) return  1
						}

						return a.label.toLowerCase() > b.label.toLowerCase()
					})
				}

				scope.$watch( 
					() => scope.key.value,
					() => {
						scope.new_option.key = scope.key.value
						scope.update()
					}
				)				

				scope.$watch(
					() => scope.new_option.key,
					() => { 
						scope.new_option.tag = icOptions.generateTag(scope.new_option); 
						icOptions.sanitizeOption(scope.new_option)
					}
				)

				scope.$watch(
					() => scope.new_option.label,
					() => { 
						scope.new_option.tag = icOptions.generateTag(scope.new_option); 
						icOptions.sanitizeOption(scope.new_option)
					}
				)

				scope.$watch(
					() => scope.new_option.link,
					() => icOptions.sanitizeOption(scope.new_option)
				)

			}
		}

	}

])





.directive('icOverlays', [

	'icOverlays',
	'icKeyboard',
	'ic',

	function(icOverlays, icKeyboard, ic){

		return {

			restrict:	"AE",
			templateUrl:"partials/ic-overlays.html",
			scope:		true,

			link: function(scope, element, attrs, ctrl, transclude){

				icOverlays.registerScope(scope)
				scope.ic = ic				

				var fromTabbable 

				function close(){
					icOverlays.toggle(null)
					scope.$digest()				

					
				}

				function elementClose(e){
					if(element[0] == e.target) close()					
				}

				function bodyClose(e){
					if(e.code == 'Escape') close()
				}

				function trackFromTabbable(event){

					if(fromTabbable) return null

					fromTabbable =	element[0].contains(document.activeElement) 
									?	icKeyboard.previousTabbable
									:	document.activeElement

				}

				function onFocusOut(event){

					if(element[0].contains(event.relatedTarget))	return null
					if(!icOverlays.active())						return null


					let nextTabbable = icKeyboard.getNextTabbable(element[0])
					nextTabbable && nextTabbable.focus()

				}


				document.body.addEventListener(	'keydown',	bodyClose, 			{passive:true})
				element[0].addEventListener(	'click',	elementClose, 		{passive:true})
				element[0].addEventListener(	'focusin',	trackFromTabbable, 	{passive:true})
				element[0].addEventListener(	'focusout',	onFocusOut,			{passive:true})

				scope.$on('$destroy', function(){

					document.body.removeEventListener(	'keydown',	bodyClose)
					element[0].removeEventListener(		'click',	elementClose)
					element[0].removeEventListener(		'focusin',	trackFromTabbable)
					element[0].removeEventListener(		'focusout',	onFocusOut)

				})

				scope.$watch( 
					() 		=> 	icOverlays.active(),
					active 	=> 	{
									if(active) return trackFromTabbable()
									
									document.contains(fromTabbable) && fromTabbable.focus()
									fromTabbable = undefined
								}

				)

			}
				
		}
	}
])



.directive('icConfirmationModal', [

	'icOverlays',

	function(icOverlays){
		return {
			restrict:		'AE',
			transclude:		true,
			templateUrl:	'partials/ic-confirmation-modal.html',

			link: function(scope){

				scope.icOverlays = icOverlays


				scope.cancel = function(){
					icOverlays.deferred.confirmationModal.reject()
					icOverlays.toggle('confirmationModal')
				}

				scope.confirm = function(){
					icOverlays.deferred.confirmationModal.resolve()
					icOverlays.toggle('confirmationModal')
				}



			}
		}
	}
])


.directive('icTransclude', [

	'translateFilter',

	function(translateFilter){
		return {

			restrict: 'A',

			scope:	{
						transclude: "<icTransclude"
					},

			link(scope, element, attrs){

				var transcludedContent
				var transclusionScope



				function update(){

					if(transcludedContent) 	transcludedContent.remove()
					if(transclusionScope)	transclusionScope.$destroy()

					if(typeof scope.transclude == 'string'){
						element.removeClass('transcluded-content')
						element.append(translateFilter(scope.transclude))
					}

					if(typeof scope.transclude == 'function'){
						element.addClass('transcluded-content')				
						
						
						scope.transclude( function(clone, scope) {
							element.append(clone)
							transcludedContent 	= clone
							transclusionScope 	= scope
						})
					}
				}

				scope.$watch("transclude", update)

				scope.$on('$destroy', function() {
					if(transclusionScope) transclusionScope.$destroy()
				})

			}
		}
	}

])

.directive('icPopup', [

	'icOverlays',

	function(icOverlays){
		return {
			restrict:		'AE',
			transclude:		true,
			templateUrl:	'partials/ic-popup.html',

			link: function(scope){

				scope.icOverlays = icOverlays

				scope.okay = function(){
					icOverlays.toggle('popup')
				}

			}
		}
	}
])




.directive('icLanguageMenu', [

	'ic',

	function(ic){
		return {
			restrict:		'AE',
			templateUrl:	'partials/ic-language-menu.html',
			scope:			{},

			link: function(scope, element){				
				scope.ic = ic
			}
		}
	}

])



.directive('icSharingMenu', [

	'$location', 
	'icSite',
	'icLanguages',
	'icConfig',
	'translateFilter',

	function($location, icSite, icLanguages, icConfig, translateFilter){
		return {
			restrict: 		'AE',
			templateUrl:	'partials/ic-sharing-menu.html',

			link: function(scope){

				scope.vars = {}

				function getVars(){

					if(!icSite.activeItem)				return null
					if(!icSite.activeItem.title) 		return null
					if(!icSite.activeItem.id)			return null

					var abs_url 	= 	$location.absUrl(),
						path		= 	$location.path(),
						title		=	icSite.activeItem.title,
						url			= 	abs_url.replace(path, '')
										+'/item/'	+ icSite.activeItem.id
										+'/l/'		+ icSite.currentLanguage

					scope.vars.url 		= url
					scope.vars.title	= title

					return scope.vars
				}

				scope.$watch(
					getVars,
					function(v){
						if(!v){
							scope.platforms = []
							return null
						}

						var mail_subject 	= 		translateFilter('INTERFACE.TITLE')+': '+v.title,
							twitter_hashtag	= 		icConfig.sharing 
												&&	icConfig.sharing.twitter
												&&	icConfig.sharing.twitter.hashtag,
							text			=		encodeURIComponent(v.title)

						scope.platforms = [
							{name: 'email',		link: 'mailto:?subject='+mail_subject+'&body='+v.url},
							{name: 'twitter', 	link: 'https://twitter.com/intent/tweet?text='+text+'&url='+v.url+'&hashtags='+twitter_hashtag},
							{name: 'facebook', 	link: 'https://www.facebook.com/sharer/sharer.php?u='+v.url+'&t='+text},
							{name: 'whatsapp',	link: 'whatsapp://send?text='+text+': '+v.url},
							{name: 'telegram',	link: 'tg://msg?text='+text+': '+v.url}
							// {name: 'google+', 	link: 'https://plus.google.com/share?url='+url},
							// {name: 'linkedin', 	link: 'https://www.linkedin.com/shareArticle?mini=true&url='+url},
						]						
					},
					true
				)

			}
		}
	}

])


.directive('icLogin',[

	'icUser',
	'icOverlays',
	'icItemStorage',
	'ic',

	function(icUser, icOverlays, icItemStorage, ic){
		return {
			restrict:		'E',
			templateUrl:	'partials/ic-login.html',
			transclude:		true,

			link: function(scope, element){
				scope.username = ''
				scope.password = ''
				scope.ic = ic

				scope.login = function(){
					icOverlays.toggle('spinner', true, true)
					icUser.login(scope.username, scope.password)
					.then(
						function(){
							// icUser.login will reload the page
						},
						function(reason){
							console.warn('icLoginDirective: login failed ', reason)
							var messages = 	{
												'unknown user': 	'INTERFACE.LOGIN_UNKNOWN_USERNAME',
												'invalid password':	'INTERFACE.LOGIN_INVALID_PASSWORD',
												'locked account':	'INTERFACE.LOGIN_ACCOUNT_LOCKED',
												'bad credentials':	'INTERFACE.LOGIN_BAD_CREDENTIALS',
											}

							return icOverlays.open('login', messages[reason] || 'INTERFACE.LOGIN_UNKNOWN', icOverlays.deferred.login, true)
						}
					)
				}

				scope.cancel = function(){
					scope.username = ''
					scope.password = ''					
					if(icOverlays.deferred.login) icOverlays.deferred.login.reject()
					icOverlays.toggle('login', false)
				}

			}
		}
	}
])



.directive('icTiles',[
	
	function(){
		return {
			restrict:		'E',
			templateUrl:	'partials/ic-tiles.html',

			link: function(scope, element){

			}
		}
	}
])


.directive('icHelp', [

	'ic',

	function(ic){
		return {
			restrict:		'AE',
			templateUrl:	'partials/ic-help.html',
			transclude:		true, 
			scope:			{
								icMessage: 		'@',
								icIconClass:	'@?'

							},

			link: function(scope, element, attrs, ctrl, transclude){
				scope.ic = ic
				scope.transclude = transclude
			}
		}
	}
])





.directive('icFooter', [

	'ic',

	function(ic){
		return {
			restrict:		'AE',
			templateUrl:	'partials/ic-footer.html',

			link: function(scope, element){
				scope.ic = ic
			}
		}
	}
])


.directive('icOneTimePopup',[

	'ic',

	function(ic){
		return {
			restrict:	'A',
			scope: 		{
							icPopupId: 		"@",
							icPopupName: 	"@",
							icPopupMessage: "<?"
						},

			link: function(scope, element, attrs){
				scope.ic = ic

				if(!scope.icPopupId){
					console.warn('icOneTimePopup: missing icPopupId')
					return null
				}
				var seen = {}

				try{
					seen = JSON.parse(localStorage.getItem('seenOneTimePopups')) || {}
				} catch(e) { console.log(e) }

				if(seen && seen[scope.icPopupId]) return true

				ic.overlays.open(scope.icPopupName, scope.icPopupMessage || undefined)
				.finally(function(){
					seen[scope.icPopupId] = true

					localStorage.setItem('seenOneTimePopups', JSON.stringify(seen))
				})
			}
		}
	}
])


.directive('icIconClasses', [

	'ic',

	function(ic){
		return {
			restrict:		'E',
			templateUrl:	'partials/ic-icon-classes.html',

			link: function(scope, element){
				scope.ic = ic

				const all_selectors 	= 	[...document.styleSheets]
											.map( sheet => {
												try{
													return [...sheet.cssRules]
												}catch(e){}
											})
											.flat()
											.map( rule => rule && rule.selectorText)
											.filter( x => !!x)

				const icon_classes		=	all_selectors
											.filter( selector => selector.match(/^.icon-[^,.:\s]+$/gi))
				
				const image_classes		=	all_selectors
											.filter( selector => selector.match(/^.image-[^,.:\s]+$/gi))	


				scope.icons				= 	icon_classes
											.map( selector => {

												const prefix_match 	=	selector.match(/^[^-]*-/)
												const prefix		= 	prefix_match && prefix_match[0]
												const core_match	=	selector.match(/^[^-]*-(.*)/)
												const core			=	core_match && core_match[1]
												const icon_class	=	selector.substr(1)												
												
												return {prefix, core, class: icon_class}
											})

				scope.images			= 	image_classes
											.map( selector => {

												const prefix_match 	=	selector.match(/^[^-]*-/)
												const prefix		= 	prefix_match && prefix_match[0]
												const core_match	=	selector.match(/^[^-]*-(.*)/)
												const core			=	core_match && core_match[1]
												const image_class	=	selector.substr(1)												
												
												return {prefix, core, class: image_class}
											})											


			}
		}
	}
])
