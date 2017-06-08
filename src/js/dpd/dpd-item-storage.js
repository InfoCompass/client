"use strict";

(function(){
	if(!window.dpd) 							console.error('icItemStorage: missing dpd. Please load dpd.js.')
	if(!(window.ic && window.ic.itemConfig)) 	console.error('icItemStorage: missing ic.itemConfig. Please load ic-item-config.js.')
	if(!(window.ic && window.ic.Item)) 			console.error('icItemStorage: missing ic.Item. Please load ic-item-dpd.js.')


	function IcItemStorage(){

		//Todo: make all functione async?
		

		var icItemStorage = this

		icItemStorage.data 				= 	[]
		icItemStorage.filters 			= 	{}
		icItemStorage.sortingCriteria	= 	{}
		icItemStorage.filteredList		= 	[]
		icItemStorage.currentStats		= 	{
												'subMatches':	{},
												'altMatches':	{},
												'tagGroups':	[],
												'altGroups':	[]
											}
		icItemStorage.refreshRequired	=	false 


		icItemStorage.storeItem = function(item_data){

			var item = icItemStorage.data.filter(function(item){ return item.id == item_data.id })[0]

			item 
			?	item.importData(item_data)
			:	icItemStorage.data.push(item = new ic.Item(item_data))

			item.internal 				= item.internal || {}
			item.internal.tags 			= item.internal.tags || []
			item.internal.sortingValues = item.internal.sortingValues || {}

			//TODO
			//icItemStorage.updateItemInternals(item)

			return item
		}

		icItemStorage.updateItemInternals = function(item_or_id){

			var item = icItemStorage.getItem(item_or_id)

			icItemStorage.itemCheckFilter(item)
			icItemStorage.matchItem(item)

			icItemStorage.refreshRequired = true


			return icItemStorage
		}

		icItemStorage.clearFilteredList = function(){
			while(icItemStorage.filteredList.length) icItemStorage.filteredList.pop()
			for(var tag in icItemStorage.currentStats.altMatches) delete icItemStorage.currentStats.altMatches[tag]
			for(var tag in icItemStorage.currentStats.subMatches) delete icItemStorage.currentStats.subMatches[tag]
			return icItemStorage
		}

		
		icItemStorage.registerFilter = function(filter_name, match_fn){

			filter_name = String(filter_name)

			if(filter_name.match(/[^a-zA-Z0-9]/))			console.error('icItemStorage: filter names must contain only letters or numbers, A-Z, a-z, 0-9: '+filter_name+'.')
			if(icItemStorage.filters[filter_name]) 			console.error('icItemStorage: filter already registered: '+filter_name+'.')
			ic.itemConfig.tags.forEach(function(tag){ 
				if(tag == filter_name) 						console.error('icItemStorage: filter names must be different from tags: "'+filter_name+'"')
			})
			
			icItemStorage.filters[filter_name] = match_fn
			icItemStorage.data.forEach(function(item){
				if(match_fn(item)) item.internal.tags.push(filter_name)
			})

			return icItemStorage
		}


		icItemStorage.itemCheckFilter = function(item_or_id, filter_name){

			var item 	= 	icItemStorage.getItem(item_or_id),
				filters = 	{}

			if(filter_name){
				filters[filter_name] = icItemStorage.filters[filter_name] || function(){}
				if(!icItemStorage.filters[filter_name]) console.warn('icItemStorage.itemCheckFilter, unknown filter: ',filter_name)
			} else {
				filters = icItemStorage.filters
			}
			

			for(filter_name in filters){

				var	pos		= item.internal.tags.indexOf(filter_name)

				if(pos != -1) item.internal.tags.splice(pos,1)

				if(icItemStorage.filters[filter_name](item)) item.internal.tags.push(filter_name)

			}



			return icItemStorage
		}

		//Todo item changes
		icItemStorage.registerSortingCriterium = function(criterium_name, compare_fn){


			if(criterium_name.match(/[^a-zA-Z]/))				console.error('icItemStorage: sort criteria names must contain only letters, A-Z, a-z: '+criterium_name+'.')
			if(icItemStorage.sortingCriteria[criterium_name]) 	console.error('icItemStorage: sort criterium name already registered: '+criterium_name+'.')

			icItemStorage.sortingCriteria[criterium_name] =	compare_fn

		
			
			icItemStorage.data
			.sort(compare_fn)
			.forEach(function(item, index){
				item.internal.sortingValues[criterium_name]	= index
			})

			return this
		}

		icItemStorage.matchItem = function(item){			

				item.internal.subMatches 	= []
				item.internal.altMatches 	= []
				item.internal.match			= false

				var tag_group_matches 	= [],
					alt_group_matches 	= [],
					combined_tags		= item.tags.concat(item.internal.tags)

				icItemStorage.currentStats.tagGroups.forEach(function(tag_group, index){
					tag_group_matches[index] = tag_group.every(function(tag){ 
						return combined_tags.indexOf(tag) != -1
					})
				})


				var failed_groups = []

				tag_group_matches.forEach(function(tag_group_match, index){ if(!tag_group_match) failed_groups.push(index) })

				if(failed_groups.length > 1) return null
				//item failed no more then one tag group:


				item.subMatch = true

				//collect alt_matches for tags:
				combined_tags.forEach(function(tag){
					if(failed_groups.length == 0 || icItemStorage.currentStats.altGroups[failed_groups[0]].indexOf(tag) != -1)
						item.internal.altMatches.push(tag)
				})


				if(failed_groups.length > 0 ) return null
				// item failed no tag group:


				item.internal.match = true

				//collect submatches for tags
				combined_tags.forEach(function(tag){
					item.internal.subMatches.push(tag)
				})

				return icItemStorage

		}

		icItemStorage.updateFilteredList = function(tag_groups, alt_groups){ //groups of tags of tags [[tag1, tag2], [tag3]]
			
			if(!tag_groups) 	tag_groups 	= []
			if(!alt_groups)		alt_groups 	= []

			//normalize tag_groups
			if(typeof tag_groups == 'string') tag_groups = [tag_groups]

			tag_groups.forEach(function(tag_group, index){
				if(typeof tag_group 			== 'string') 	tag_groups[index] 	= [tag_group]
				if(!tag_group)									tag_groups[index] 	= []
				if(typeof alt_groups[index] 	== 'string')	alt_groups[index] 	= [alt_groups[index]]
				if(!alt_groups[index])							alt_groups[index] 	= []
			})
			

			icItemStorage.currentStats.tagGroups = tag_groups
			icItemStorage.currentStats.altGroups = alt_groups 


			icItemStorage.data.forEach(icItemStorage.matchItem)
			icItemStorage.refreshFilteredList()

			return icItemStorage
		}

		icItemStorage.refreshFilteredList = function(){
			icItemStorage.clearFilteredList()
			icItemStorage.data.forEach(function(item){
				item.internal.altMatches.forEach(function(tag){ icItemStorage.currentStats.altMatches[tag] = (icItemStorage.currentStats.altMatches[tag] ||0) + 1 })
				item.internal.subMatches.forEach(function(tag){ icItemStorage.currentStats.subMatches[tag] = (icItemStorage.currentStats.subMatches[tag] ||0) + 1 })
				if(item.internal.match) icItemStorage.filteredList.push(item)
			})

			icItemStorage.refreshRequired = false
		}



		icItemStorage.sortFilteredList = function(criterium){
			if(!icItemStorage.sortingCriteria[criterium]) console.error('icItemStorage: unknown sorting criterium: '+ criterium)
			icItemStorage.filteredList.sort(function(item_1, item_2){

				if(item_1.internal.sortingValue[criterium] === undefined || item_2.internal.sortingValue[criterium] === undefined) return icItemStorage.sortingCriteria[criterium](item_1, item_2)
				if(item_1.internal.sortingValue[criterium] > item_2.internal.sortingValue[criterium]) return 1
				if(item_1.internal.sortingValue[criterium] < item_2.internal.sortingValue[criterium]) return -1
				
				return 1

			})
		}

		icItemStorage.getItem = function(item_or_id){
			var id		= item_or_id.id || item_or_id,
				item 	= icItemStorage.data.filter(function(item){ return item.id == id })[0] 

			if(!item){
				item = icItemStorage.storeItem({id: id})
				item.preliminary = true
			}

			item.download()
			.then(
				function(){
					item.preliminary = false
					return item
				},
				function(reason){
					console.error('icItemStorage.getItem: update failed.', reason)
					return Promise.reject(reason)
				}
			)

			return item
		}

		icItemStorage.downloadAll = function(){
			return 	dpd(ic.itemConfig.collectionName).get()
					.then(
						function(data){
							data.forEach(function(item_data){
								icItemStorage.storeItem(item_data)
							}) 
						},
						function(reason){
							console.error('icItemStorage: unable to load items: '+reason)
							return Promise.reject(reason)
						}
					)
		}

		var searchTerms = []

		icItemStorage.getSearchTag = function(search_term){

			if(!search_term || typeof search_term != 'string') return null

			search_term = search_term.replace(/\s+/,'&')

			var index 		= searchTerms.indexOf(search_term),
				search_tag 	= 'search%1' 

			if(index == -1){

				searchTerms.push(search_term)
				index = searchTerms.length-1


				var regex 					= 	new RegExp(search_term, 'i'),
					searchable_properties 	= 	ic.itemConfig.properties.filter(function(property){
													return property.searchable
												})

				icItemStorage.registerFilter(search_tag.replace(/%1/,index), function(item){
					return	searchable_properties.some(function(property){
								switch(property.type){
									case "array": 
										return item[property.name].some(function(sub){ return sub.match(regex)})
									break 

									case "object": 
										return Object.keys(item[property.name]).some(function(key){ return item[property.name][key].match(regex) })
									break 

									default:
										return String(item[property.name]).match(regex)
									break
								}
							})
				}) 			
			} 


			return search_tag.replace(/%1/,index)
		}

	}

	window.ic.itemStorage = new IcItemStorage()

}())