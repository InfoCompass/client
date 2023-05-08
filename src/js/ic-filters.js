"use strict";


angular.module('icFilters', [
	'icServices',
])


.filter('icLink',[

	'icSite',

	function(icSite){

		var fn =  function(config){

			var path 	= icSite.getNewPath(config)
			var search 	= icSite.getNewSearch(config)
			return path + (search ? '?s='+search : '')
		}

		fn.$stateful = true

		return fn
	}
	
])

.filter('icType', [

	'icTaxonomy',

	function(icTaxonomy){
		return function(item_or_tags){
			return item_or_tags && icTaxonomy.getType(item_or_tags.tags || item_or_tags)
		}
	}
])

.filter('icCategory', [

	'icTaxonomy',

	function(icTaxonomy){
		return function(item_or_tags){
			return item_or_tags && icTaxonomy.getCategory(item_or_tags.tags || item_or_tags)
		}
	}
])

.filter('icCategories', [

	'icTaxonomy',

	function(icTaxonomy){
		return function(item_or_tags){
			return item_or_tags && icTaxonomy.getCategories(item_or_tags.tags || item_or_tags)
		}
	}
])

.filter('icSubCategories', [

	'icTaxonomy',

	function(icTaxonomy){
		return function(item_or_tags){
			return item_or_tags && icTaxonomy.getSubCategories(item_or_tags.tags || item_or_tags)
		}
	}
])


.filter('icFullCategory', [

	'icTaxonomy',

	function(icTaxonomy){

		return function(names){
			if(typeof names == 'string') names = [names]

			return names.map( name => icTaxonomy.categories.find( category => category.name == name) )	
		}

	}

])



.filter('icSubCategories', [

	'icTaxonomy',

	function(icTaxonomy){
		return function(item_or_tags){
			return item_or_tags && icTaxonomy.getSubCategories(item_or_tags.tags || item_or_tags)
		}
	}
])


.filter('icUnsortedTags',[

	'icTaxonomy',

	function(icTaxonomy){
		return function(item_or_tags, group_name){
			return item_or_tags && icTaxonomy.getUnsortedTags(item_or_tags.tags || item_or_tags, group_name)
		}
	}
])

.filter('icTags',[

	function(){

		return function(array_of_items, tags){
			return array_of_items.filter( item => item.tags && tags.some( tag => item.tags.includes(tag)))
		}

	}
])


.filter('icOptions',[

	'icOptions',

	function(icOptions){

		return function(item_or_tags, key){
			if(!item_or_tags) return null
			return icOptions.getOptions(item_or_tags.tags || item_or_tags, key)
		}
	}

])


.filter('icDistrict', [

	'icTaxonomy',

	function(icTaxonomy){
		return function(item_or_tags){
			return item_or_tags && icTaxonomy.getDistrict(item_or_tags.tags || item_or_tags)
		}
	}
])


.filter('icPrognoseraum', [

	'icTaxonomy',

	function(icTaxonomy){
		return function(item_or_tags){
			return item_or_tags && icTaxonomy.getPrognoseraum(item_or_tags.tags || item_or_tags)
		}
	}
])


.filter('icBezirksregion', [

	'icTaxonomy',

	function(icTaxonomy){
		return function(item_or_tags){
			return item_or_tags && icTaxonomy.getBezirksregion(item_or_tags.tags || item_or_tags)
		}
	}
])


.filter('project',[

	'icItemRef',

	function(icItemRef){

		return function(item, keys){

			return icItemRef.project(item, keys)

		}

	}
])


.filter('icItem', [

	'icItemStorage',

	function(icItemStorage){

		return function(id){
			return icItemStorage.getItem(id)
		}
	}

])


// this filter is meant to be overwritten in custom themes
.filter('icFullTitle', [

	() => {
		return function(item){
			return	item
					?	item.title
					:	''
		}
	}
])

.filter('osmLink', [
	function(){
		return function(config){
			if(!config) return undefined
			return 	config.longitude && config.latitude
					?	'https://www.openstreetmap.org/?mlat='+config.latitude +'&mlon=' + config.longitude + '#map=17/'+config.latitude+'/'+config.longitude
					:	'https://www.openstreetmap.org/search?query='+config.address + ', ' + config.zip + ', ' + config.city
		}
	}
])




.filter('gmLink', [
	function(){
		return function(config){
			if(!config) return undefined
			return	config.longitude && config.latitude
					?	'https://www.google.de/maps/place/'+config.latitude+'+' + config.longitude + '/@'+config.latitude + ',' + config.longitude +',17z'
					:	'https://www.google.de/maps/place/'+config.address+', '+config.zip+', '+config.city
		}
	}
])



.filter('icLinkPrefix', function(){
	return function(key){
		return	{
					'website':		'',
					'twitter':		'',
					'facebook':		'',
					'linkedin':		'',
					'instagram':	'',
					'pinterest':	'',
					'youtube':		'',
					'vimeo':		'',
					'mobile':		'tel:',
					'email':		'mailto:',
					'phone':		'tel:'
				}[key]
	}
})


.filter('icDate', [

	'icSite',

	function(icSite){

		var toLocaleDateStringSupportsLocales 	= false,
			dates								= {}

		try {
			new Date().toLocaleString('i')
		} catch (e) {
			toLocaleDateStringSupportsLocales =  e instanceof RangeError
		}

		function icDateFilter(date_str, use_time){

			if(!date_str) return undefined

			icSite.date_str = date_str

			var date

			if(date_str.match && date_str.match(/(\d\d\d\d)-(\d\d)-(\d\d)T(\d\d):(\d\d)/)){

				var dmatches = date_str.match(/(\d\d\d\d)-(\d\d)-(\d\d)/),
					tmatches = date_str.match(/T(\d\d):(\d\d)/)


				date = new Date(Date.UTC(parseInt(dmatches[1]), parseInt(dmatches[2])-1, parseInt(dmatches[3]), parseInt(tmatches[1]), parseInt(tmatches[2])))

				icSite.dmatches = dmatches
				icSite.tmatches = tmatches
				icSite.date

			}else{
				date = new Date(date_str)
			}


			if(isNaN(date.getTime())) return undefined


			dates[date_str] 						= dates[date_str] || {}
			dates[date_str][icSite.currentLanguage]	= dates[date_str][icSite.currentLanguage] || {}

			if(!dates[date_str][icSite.currentLanguage].withoutTime){
				dates[date_str][icSite.currentLanguage].withoutTime = 	toLocaleDateStringSupportsLocales
																		?	date.toLocaleDateString(icSite.currentLanguage)
																		:	date_str
			} 

			if(!dates[date_str][icSite.currentLanguage].withTime && use_time){
				dates[date_str][icSite.currentLanguage].withTime	= 	dates[date_str][icSite.currentLanguage].withoutTime + ', ' +
																			(
																				toLocaleDateStringSupportsLocales
																				?	date.toLocaleTimeString(icSite.currentLanguage, {timeZone:'UTC'})
																				:	''
																			)
			}

			return 	use_time
					?	dates[date_str][icSite.currentLanguage].withTime
					:	dates[date_str][icSite.currentLanguage].withoutTime

		}

		icDateFilter.$stateful = true

		return icDateFilter

	}
])


.filter('icItemLink',[
	function(){
		return function(item_or_id){
			if(!item_or_id) return ''
			return location.origin+'/item/'+(item_or_id.id || item_or_id) 
		}
	}
])


// .filter('trustAsHtml',[
// 	'$sce',

// 	function($sce){
// 		return function(html){
// 			console.error('filter trsuAsHTML, do not use')
// 			return html//$sce.trustAsHtml(html)
// 		}
// 	}
// ])


.filter('match', [

	function(){
		return function(value, exp){

			try {
				var exp = new RegExp(exp, 'i')

				if(typeof value != 'string') return false

				return !!value.match(exp)
			}catch(e){
				return false
			}
		}
	}
])



.filter('floor', [

	function(){

		return function(x){
			return Math.floor(x)
		}
	}
])

.filter('ceil', [

	function(){

		return function(x){
			return Math.ceil(x)
		}
	}
])


.filter('range', [

	function(){

		var ranges = {}

		return function(a, total){
			var total = parseInt(total) || 0

			ranges[total] = ranges[total] || Array(total).fill(1).map(function(value, index){ return index })

			return ranges[total]
		}
	}
])



.filter('autoTranslator', [

	function(){

		return function(texts){

			const isArray 		= Array.isArray(texts)

			if(!isArray) texts 	= [texts] 

			const result 		= 	texts.map( text => {
										const matches = text && text.match(/^\[(.+):\]/)
										return matches && matches[1]
									})
									.filter( x => !!x)

			const uniqueResults = Array.from( new Set(result) )					


			return 	isArray
					?	uniqueResults
					:	uniqueResults[0]

		}
	}
])



.filter('clearTranslator', [

	function(){

		return function(text){
			return text && text.replace(/^\[(.+):\]\s*/,'')
		}
	}
])


.filter('textTranslator', [

	'autoTranslatorFilter',
	'clearTranslatorFilter',
	'translateFilter',

	function(autoTranslatorFilter, clearTranslatorFilter, translateFilter){

		return function(text){

			if(!text) 		return 	text

			const translator 	= 	autoTranslatorFilter(text)

			if(!translator)	return 	text

			const	prefix		=	translateFilter('INTERFACE.AUTO_TRANSLATED_BY')
			const 	result		=	`${clearTranslatorFilter(text)} (${prefix} ${autoTranslatorFilter(text)})`
									 
			return result
									
		}
	}
])

.filter('autoTranslators',[

	'autoTranslatorFilter',
	'icItemConfig',

	function(autoTranslatorFilter, icItemConfig){

		return function(item, lang, extraLines){

			if(!item) return false

			if(!Array.isArray(extraLines)) extraLines = [extraLines]

			const properties 	= 	icItemConfig.properties
									.filter( 	property => property.translatable)
									.map(		property => property.name)

			const texts			=	properties
									.map( property_name  => item[property_name] && item[property_name][lang])				

			const translators	=	autoTranslatorFilter([...texts, ...extraLines])

			return translators

									
		}
	}
])


