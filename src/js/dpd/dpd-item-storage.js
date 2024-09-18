"use strict"; 

//this is causing an error in IE11 at accent map =(

(function(){
	if(!window.dpd) 							console.error('icItemStorage: missing dpd. Please load dpd.js.')
	if(!(window.ic && window.ic.itemConfig)) 	console.error('icItemStorage: missing ic.itemConfig. Please load ic-item-config.js.')
	if(!(window.ic && window.ic.Item)) 			console.error('icItemStorage: missing ic.Item. Please load ic-item-dpd.js.')



	function httpGet(url){

		return new Promise(function (resolve, reject) {
			var xhr = new XMLHttpRequest();
			xhr.open('get', url);
			xhr.onload = function () {
				if(xhr.readyState === 4) {
					var status = xhr.status;
					if (status === 0 || (status >= 200 && status < 400)) {
						try{
							resolve(JSON.parse(xhr.response))
						} catch(e) {
							reject(e)
						}
					} else {
						reject(status)
					}
				}
			}
			xhr.onerror = reject;
			xhr.send();
		});

	}




	function IcItemStorage(){
		

		var icItemStorage = this

		icItemStorage.data 				= 	[]
		icItemStorage.filters 			= 	{}
		icItemStorage.sortingCriteria	= 	{}
		icItemStorage.filteredList		= 	[]
		icItemStorage.currentStats		= 	{
												'totals':	{},
												'subMatches':		{},
												'altMatches':		{},
												'tagGroups':		[],
												'altGroups':		[],
												'sortBy':			undefined,
												'sortDirection':	1
											}
		icItemStorage.refreshRequired	=	false 

		icItemStorage.asyncTriggers 	=	[] 


		icItemStorage.addAsyncTrigger = function(triggerFn){
			if(typeof triggerFn != 'function') console.error('icItemStorage.addAsyncTrigger: triggerFn not a function.')
			icItemStorage.asyncTriggers.push(triggerFn)

			return icItemStorage
		}

		icItemStorage.removeAsyncTrigger = function(triggeFn){
			var pos = icItemStorage.asyncTriggers.indexOf(triggeFn)

			if(pos == -1) console.warn('icItemStorage.removeAsyncTrigger: triggerFn not a found.')

			icItemStorage.asyncTriggers.splice(pos,1)

			return icItemStorage
		}

		icItemStorage.runAsyncTriggers = function(){
			console.log('icItemStorage: runAsyncTriggers')
			icItemStorage.asyncTriggers.forEach(function(triggerFn){
				triggerFn.call()
			})

			return icItemStorage
		}

		icItemStorage.storeItem = function(item_data, skip_internals){

			var item = icItemStorage.data.filter(function(item){ return item.id == item_data.id })[0]

			item 
			?	item.importData(item_data)
			:	icItemStorage.data.push(item = new ic.Item(item_data))

			item.internal 				= item.internal || {}
			item.internal.tags 			= item.internal.tags || []
			item.internal.sortingValues = item.internal.sortingValues || {}
			item.internal.altMatches	= item.internal.altMatches || []
			item.internal.subMatches	= item.internal.subMatches || []
			item.internal.new			= item.internal.new || false


			//TODO
			if(!skip_internals) icItemStorage.updateItemInternals(item)

			return item
		}

		icItemStorage.removeItem = function(item_or_id, skip_internals){
			var item 	= 	icItemStorage.getItem(item_or_id),
				pos		=  	icItemStorage.data.indexOf(item)

			if(pos != -1) icItemStorage.data.splice(pos, 1)

			//TODO
			if(!skip_internals) icItemStorage.updateItemInternals(item)

			return icItemStorage
		}

		icItemStorage.updateItemInternals = function(item_or_id){

			var item = icItemStorage.getItem(item_or_id)

			icItemStorage.itemCheckFilter(item)
			icItemStorage.matchItem(item)

			icItemStorage.refreshRequired = true


			return icItemStorage
		}

		icItemStorage.getIsolatedItem = function(item_data){
			return new ic.Item(item_data)
		}

		icItemStorage.clearFilteredList = function(){
			while(icItemStorage.filteredList.length) icItemStorage.filteredList.pop()
			for(var tag in icItemStorage.currentStats.totals)			delete icItemStorage.currentStats.totals[tag]
			for(var tag in icItemStorage.currentStats.altMatches) 		delete icItemStorage.currentStats.altMatches[tag]
			for(var tag in icItemStorage.currentStats.subMatches) 		delete icItemStorage.currentStats.subMatches[tag]
			return icItemStorage
		}

		
		icItemStorage.registerFilter = function(filter_name, match_fn){
			filter_name = String(filter_name)

			if(filter_name.match(/^[^a-zA-Z0-9_\-]*$/))			throw('icItemStorage: filter names must contain only letters, numbers or underscores, A-Z, a-z, 0-9. _: '+filter_name+'.')
			if(icItemStorage.filters[filter_name]) 				console.warn('icItemStorage: filter already registered: '+filter_name+'.')
			//TODO
			// ic.itemConfig.tags.forEach(function(tag){ 
			// 	if(tag == filter_name) 						console.error('icItemStorage: filter names must be different from tags: "'+filter_name+'"')
			// })
			
			icItemStorage.filters[filter_name] = match_fn
			icItemStorage.data.forEach(function(item){ icItemStorage.itemCheckFilter(item, filter_name)	})
			icItemStorage.data.forEach(icItemStorage.matchItem)
			icItemStorage.refreshRequired = true

			return icItemStorage
		}


		icItemStorage.itemCheckFilter = function(item_or_id, filter_name){
			
			var item 	= 	icItemStorage.getItem(item_or_id),
				filters = 	{}


			//TODO: this is a bit complicated for some reason. should be much shorter
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





		function preDefSort(config){

			// config = { type: ..., property: ..., param: ...}
			// type in ['alphabetical']

			var worker 	= new Worker('worker/sort.js'),
				promise = new Promise(function(resolve, reject){ 
								worker.onmessage = function(event){ resolve(event.data) }
								worker.onerror = reject 
							}) 

			worker.postMessage({
				data:	icItemStorage.data.map(function(item){
							return {id: item.id, property: item[config.property]}
						}),
				type:	config.type,
				param:	config.param
			})

			return promise
		}



		//Todo item changes ? 
		icItemStorage.registerSortingCriterium = function(criterium_name, compare_fn, config){

			if(criterium_name.match(/[^a-zA-Z_]/))				console.error('icItemStorage: sort criteria names must contain only underscore and letters, A-Z, a-z: '+criterium_name+'.')
			if(icItemStorage.sortingCriteria[criterium_name]) 	console.error('icItemStorage: sort criterium name already registered: '+criterium_name+'.')

			var run = 	config
						? 	preDefSort(config)
							.then(function(result){
								icItemStorage.data.forEach(function(item){
									item.internal.sortingValues[criterium_name] = result[item.id]
								})
							})
						:	Promise.resolve()	
							.then(function(){
								icItemStorage.data.sort(compare_fn)
								.forEach(function(item, index){
									item.internal.sortingValues[criterium_name]	= index
								})							
							})
			return 	run
					.then(function(){
						icItemStorage.sortingCriteria[criterium_name] =	compare_fn
						//since registering a sorting criterium is async, 
						//icItemStorage might have already tried to sort with it before registering was complete:
						if(icItemStorage.currentStats.sortBy == criterium_name){
							icItemStorage.sortFilteredList()
							icItemStorage.runAsyncTriggers()
						}
					})
		}


		function isSubset(a1, a2){
			return a1.every( item => a2.includes(item) )
		}

		icItemStorage.matchItem = function(item){			

				item.internal.subMatches 	= []
				item.internal.altMatches 	= []
				item.internal.match			= false

				var tag_group_matches 	= [],
					alt_group_matches 	= [],
					combined_tags		= [...item.tags, ...item.internal.tags]


				icItemStorage.currentStats.tagGroups.forEach(function(tag_group, index){
					tag_group_matches[index] = isSubset(tag_group, combined_tags)
				})


				var failed_groups = []

				tag_group_matches.forEach(function(tag_group_match, index){ if(!tag_group_match) failed_groups.push(index) })

				if(failed_groups.length > 1) return null

				//item failed no more than one tag group:


				// is this necessary/useful?
				item.subMatch = true

				//collect alt_matches for tags:
				combined_tags.forEach(function(tag){
					if(failed_groups.length == 0 || icItemStorage.currentStats.altGroups[failed_groups[0]].includes(tag) )
						item.internal.altMatches.push(tag)
				})


				if(failed_groups.length == 1) return null

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

			icItemStorage.data.forEach( item => {
				var combined_tags = [...item.tags, ...item.internal.tags]

				combined_tags.forEach(				tag => { icItemStorage.currentStats.totals[tag] 	= (icItemStorage.currentStats.totals[tag]		|| 0) + 1 })
				item.internal.altMatches.forEach(	tag => { icItemStorage.currentStats.altMatches[tag] = (icItemStorage.currentStats.altMatches[tag] 	|| 0) + 1 })
				item.internal.subMatches.forEach(	tag => { icItemStorage.currentStats.subMatches[tag]	= (icItemStorage.currentStats.subMatches[tag] 	|| 0) + 1 })

				if(item.internal.match) icItemStorage.filteredList.push(item)
			})

			icItemStorage.sortFilteredList()

			icItemStorage.refreshRequired = false
		}



		icItemStorage.sortFilteredList = function(criterium, dir){


			var dir = (dir == -1) ?  -1 : 1


			if(criterium){
				icItemStorage.currentStats.sortBy 			= criterium
				icItemStorage.currentStats.sortDirection 	= dir
			} else {
				criterium 	= icItemStorage.currentStats.sortBy 
				dir 		= icItemStorage.currentStats.sortDirection
			}

			if(!criterium && !icItemStorage.currentStats.sortBy){
				console.warn('icItemStorage: no sorting criterium provided.')
				return null	
			} 

			if(!icItemStorage.sortingCriteria[criterium]){
				console.warn('icItemStorage: missing compare function: '+ criterium + ' Maybe sorting criterium has not yet finished registering.')
				return null
			}

			icItemStorage.filteredList.sort(function(item_1, item_2){

				//TODO set sorting value=?

				if(item_1.internal.sortingValues[criterium] === undefined || item_2.internal.sortingValues[criterium] === undefined) return dir * icItemStorage.sortingCriteria[criterium](item_1, item_2)
				if(item_1.internal.sortingValues[criterium] > item_2.internal.sortingValues[criterium]) return dir
				if(item_1.internal.sortingValues[criterium] < item_2.internal.sortingValues[criterium]) return -1 *dir
				
				return 0
			})
		}


		icItemStorage.getItem = function(item_or_id, force_download){

			if(!item_or_id) return null

			const id		= item_or_id.id || item_or_id
			let	item 		= icItemStorage.data.find(function(item){ return item.id == id })

			if(item) return item

			// preliminary item
			item = icItemStorage.storeItem({id: id})				

			if(force_download){
				icItemStorage.ready
				.then( () 	=> 	icItemStorage.getItem(id) )				
				.then( item	=> 	item && item.remoteItem 
								?	Promise.resolve()
								:	item.download()
				)				
				.then(
					function(){
						icItemStorage.runAsyncTriggers()
						
						return item
					},
					function(reason){
						console.warn('icItemStorage.getItem: update failed.', reason)
						
						icItemStorage.runAsyncTriggers()

						return Promise.reject(reason)
					}
				)
			}

			return item
		}

		//This seems to be the only place where dpd is actually used! Also on every Item-Object!

		icItemStorage.downloadAll = function(url){

			return 	(
						typeof url == 'string'
						?	httpGet(url).then( result =>  result.items )
						:	Promise.reject('no publicItems url')
					)
					.catch( function() { return dpd(ic.itemConfig.collectionName).get() })
					.then(
						function(data){


							/* 
							 * start proposals
							 *
							 * This was previously done in the backend and took very long;
							 * that's why I moved it here:
							*/

							const normal_items		=	[]														
							const proposals 		= 	[]

							data.forEach( item_data => {
								if(!item_data.proposalFor) normal_items.push(item_data)
								if( item_data.proposalFor) proposals.push(item_data)
							})

							console.log({ proposals })

							// add item proposals to the target items							
							proposals.forEach( item_proposal => {

								const id 			= item_proposal.proposalFor
								const target_item	= normal_items.find( item_data => item_data.id == id )

								if(!target_item) return

								target_item.proposals = target_item.proposals || []
								target_item.proposals.push(item_proposal)

							})

							/* end proposals */

							normal_items.forEach(function(item_data){

								if(item_data.proposals && item_data.proposals.length) console.log(item_data.proposals)

								icItemStorage.storeItem(item_data, false) //for some reason second parameter skip_internals was set to true, why?
							}) 
							icItemStorage.runAsyncTriggers()
						},
						function(reason){
							
							console.error('icItemStorage: unable to load items: '+reason)

							icItemStorage.runAsyncTriggers()

							return Promise.reject(reason)
						}
					)
		}

		var searchTerms = [],
			accent_map = {'ẚ':'a','Á':'a','á':'a','À':'a','à':'a','Ă':'a','ă':'a','Ắ':'a','ắ':'a','Ằ':'a','ằ':'a','Ẵ':'a','ẵ':'a','Ẳ':'a','ẳ':'a','Â':'a','â':'a','Ấ':'a','ấ':'a','Ầ':'a','ầ':'a','Ẫ':'a','ẫ':'a','Ẩ':'a','ẩ':'a','Ǎ':'a','ǎ':'a','Å':'a','å':'a','Ǻ':'a','ǻ':'a','Ä':'a','ä':'a','Ǟ':'a','ǟ':'a','Ã':'a','ã':'a','Ȧ':'a','ȧ':'a','Ǡ':'a','ǡ':'a','Ą':'a','ą':'a','Ā':'a','ā':'a','Ả':'a','ả':'a','Ȁ':'a','ȁ':'a','Ȃ':'a','ȃ':'a','Ạ':'a','ạ':'a','Ặ':'a','ặ':'a','Ậ':'a','ậ':'a','Ḁ':'a','ḁ':'a','Ⱥ':'a','ⱥ':'a','Ǽ':'a','ǽ':'a','Ǣ':'a','ǣ':'a','Ḃ':'b','ḃ':'b','Ḅ':'b','ḅ':'b','Ḇ':'b','ḇ':'b','Ƀ':'b','ƀ':'b','ᵬ':'b','Ɓ':'b','ɓ':'b','Ƃ':'b','ƃ':'b','Ć':'c','ć':'c','Ĉ':'c','ĉ':'c','Č':'c','č':'c','Ċ':'c','ċ':'c','Ç':'c','ç':'c','Ḉ':'c','ḉ':'c','Ȼ':'c','ȼ':'c','Ƈ':'c','ƈ':'c','ɕ':'c','Ď':'d','ď':'d','Ḋ':'d','ḋ':'d','Ḑ':'d','ḑ':'d','Ḍ':'d','ḍ':'d','Ḓ':'d','ḓ':'d','Ḏ':'d','ḏ':'d','Đ':'d','đ':'d','ᵭ':'d','Ɖ':'d','ɖ':'d','Ɗ':'d','ɗ':'d','Ƌ':'d','ƌ':'d','ȡ':'d','ð':'d','É':'e','Ə':'e','Ǝ':'e','ǝ':'e','é':'e','È':'e','è':'e','Ĕ':'e','ĕ':'e','Ê':'e','ê':'e','Ế':'e','ế':'e','Ề':'e','ề':'e','Ễ':'e','ễ':'e','Ể':'e','ể':'e','Ě':'e','ě':'e','Ë':'e','ë':'e','Ẽ':'e','ẽ':'e','Ė':'e','ė':'e','Ȩ':'e','ȩ':'e','Ḝ':'e','ḝ':'e','Ę':'e','ę':'e','Ē':'e','ē':'e','Ḗ':'e','ḗ':'e','Ḕ':'e','ḕ':'e','Ẻ':'e','ẻ':'e','Ȅ':'e','ȅ':'e','Ȇ':'e','ȇ':'e','Ẹ':'e','ẹ':'e','Ệ':'e','ệ':'e','Ḙ':'e','ḙ':'e','Ḛ':'e','ḛ':'e','Ɇ':'e','ɇ':'e','ɚ':'e','ɝ':'e','Ḟ':'f','ḟ':'f','ᵮ':'f','Ƒ':'f','ƒ':'f','Ǵ':'g','ǵ':'g','Ğ':'g','ğ':'g','Ĝ':'g','ĝ':'g','Ǧ':'g','ǧ':'g','Ġ':'g','ġ':'g','Ģ':'g','ģ':'g','Ḡ':'g','ḡ':'g','Ǥ':'g','ǥ':'g','Ɠ':'g','ɠ':'g','Ĥ':'h','ĥ':'h','Ȟ':'h','ȟ':'h','Ḧ':'h','ḧ':'h','Ḣ':'h','ḣ':'h','Ḩ':'h','ḩ':'h','Ḥ':'h','ḥ':'h','Ḫ':'h','ḫ':'h','H':'h','̱':'h','ẖ':'h','Ħ':'h','ħ':'h','Ⱨ':'h','ⱨ':'h','Í':'i','í':'i','Ì':'i','ì':'i','Ĭ':'i','ĭ':'i','Î':'i','î':'i','Ǐ':'i','ǐ':'i','Ï':'i','ï':'i','Ḯ':'i','ḯ':'i','Ĩ':'i','ĩ':'i','İ':'i','i':'i','Į':'i','į':'i','Ī':'i','ī':'i','Ỉ':'i','ỉ':'i','Ȉ':'i','ȉ':'i','Ȋ':'i','ȋ':'i','Ị':'i','ị':'i','Ḭ':'i','ḭ':'i','I':'i','ı':'i','Ɨ':'i','ɨ':'i','Ĵ':'j','ĵ':'j','J':'j','̌':'j','ǰ':'j','ȷ':'j','Ɉ':'j','ɉ':'j','ʝ':'j','ɟ':'j','ʄ':'j','Ḱ':'k','ḱ':'k','Ǩ':'k','ǩ':'k','Ķ':'k','ķ':'k','Ḳ':'k','ḳ':'k','Ḵ':'k','ḵ':'k','Ƙ':'k','ƙ':'k','Ⱪ':'k','ⱪ':'k','Ĺ':'a','ĺ':'l','Ľ':'l','ľ':'l','Ļ':'l','ļ':'l','Ḷ':'l','ḷ':'l','Ḹ':'l','ḹ':'l','Ḽ':'l','ḽ':'l','Ḻ':'l','ḻ':'l','Ł':'l','ł':'l','Ł':'l','̣':'l','ł':'l','̣':'l','Ŀ':'l','ŀ':'l','Ƚ':'l','ƚ':'l','Ⱡ':'l','ⱡ':'l','Ɫ':'l','ɫ':'l','ɬ':'l','ɭ':'l','ȴ':'l','Ḿ':'m','ḿ':'m','Ṁ':'m','ṁ':'m','Ṃ':'m','ṃ':'m','ɱ':'m','Ń':'n','ń':'n','Ǹ':'n','ǹ':'n','Ň':'n','ň':'n','Ñ':'n','ñ':'n','Ṅ':'n','ṅ':'n','Ņ':'n','ņ':'n','Ṇ':'n','ṇ':'n','Ṋ':'n','ṋ':'n','Ṉ':'n','ṉ':'n','Ɲ':'n','ɲ':'n','Ƞ':'n','ƞ':'n','ɳ':'n','ȵ':'n','N':'n','̈':'n','n':'n','̈':'n','Ó':'o','ó':'o','Ò':'o','ò':'o','Ŏ':'o','ŏ':'o','Ô':'o','ô':'o','Ố':'o','ố':'o','Ồ':'o','ồ':'o','Ỗ':'o','ỗ':'o','Ổ':'o','ổ':'o','Ǒ':'o','ǒ':'o','Ö':'o','ö':'o','Ȫ':'o','ȫ':'o','Ő':'o','ő':'o','Õ':'o','õ':'o','Ṍ':'o','ṍ':'o','Ṏ':'o','ṏ':'o','Ȭ':'o','ȭ':'o','Ȯ':'o','ȯ':'o','Ȱ':'o','ȱ':'o','Ø':'o','ø':'o','Ǿ':'o','ǿ':'o','Ǫ':'o','ǫ':'o','Ǭ':'o','ǭ':'o','Ō':'o','ō':'o','Ṓ':'o','ṓ':'o','Ṑ':'o','ṑ':'o','Ỏ':'o','ỏ':'o','Ȍ':'o','ȍ':'o','Ȏ':'o','ȏ':'o','Ơ':'o','ơ':'o','Ớ':'o','ớ':'o','Ờ':'o','ờ':'o','Ỡ':'o','ỡ':'o','Ở':'o','ở':'o','Ợ':'o','ợ':'o','Ọ':'o','ọ':'o','Ộ':'o','ộ':'o','Ɵ':'o','ɵ':'o','Ṕ':'p','ṕ':'p','Ṗ':'p','ṗ':'p','Ᵽ':'p','Ƥ':'p','ƥ':'p','P':'p','̃':'p','p':'p','̃':'p','ʠ':'q','Ɋ':'q','ɋ':'q','Ŕ':'r','ŕ':'r','Ř':'r','ř':'r','Ṙ':'r','ṙ':'r','Ŗ':'r','ŗ':'r','Ȑ':'r','ȑ':'r','Ȓ':'r','ȓ':'r','Ṛ':'r','ṛ':'r','Ṝ':'r','ṝ':'r','Ṟ':'r','ṟ':'r','Ɍ':'r','ɍ':'r','ᵲ':'r','ɼ':'r','Ɽ':'r','ɽ':'r','ɾ':'r','ᵳ':'r','ß':'s','Ś':'s','ś':'s','Ṥ':'s','ṥ':'s','Ŝ':'s','ŝ':'s','Š':'s','š':'s','Ṧ':'s','ṧ':'s','Ṡ':'s','ṡ':'s','ẛ':'s','Ş':'s','ş':'s','Ṣ':'s','ṣ':'s','Ṩ':'s','ṩ':'s','Ș':'s','ș':'s','ʂ':'s','S':'s','̩':'s','s':'s','̩':'s','Þ':'t','þ':'t','Ť':'t','ť':'t','T':'t','̈':'t','ẗ':'t','Ṫ':'t','ṫ':'t','Ţ':'t','ţ':'t','Ṭ':'t','ṭ':'t','Ț':'t','ț':'t','Ṱ':'t','ṱ':'t','Ṯ':'t','ṯ':'t','Ŧ':'t','ŧ':'t','Ⱦ':'t','ⱦ':'t','ᵵ':'t','ƫ':'t','Ƭ':'t','ƭ':'t','Ʈ':'t','ʈ':'t','ȶ':'t','Ú':'u','ú':'u','Ù':'u','ù':'u','Ŭ':'u','ŭ':'u','Û':'u','û':'u','Ǔ':'u','ǔ':'u','Ů':'u','ů':'u','Ü':'u','ü':'u','Ǘ':'u','ǘ':'u','Ǜ':'u','ǜ':'u','Ǚ':'u','ǚ':'u','Ǖ':'u','ǖ':'u','Ű':'u','ű':'u','Ũ':'u','ũ':'u','Ṹ':'u','ṹ':'u','Ų':'u','ų':'u','Ū':'u','ū':'u','Ṻ':'u','ṻ':'u','Ủ':'u','ủ':'u','Ȕ':'u','ȕ':'u','Ȗ':'u','ȗ':'u','Ư':'u','ư':'u','Ứ':'u','ứ':'u','Ừ':'u','ừ':'u','Ữ':'u','ữ':'u','Ử':'u','ử':'u','Ự':'u','ự':'u','Ụ':'u','ụ':'u','Ṳ':'u','ṳ':'u','Ṷ':'u','ṷ':'u','Ṵ':'u','ṵ':'u','Ʉ':'u','ʉ':'u','Ṽ':'v','ṽ':'v','Ṿ':'v','ṿ':'v','Ʋ':'v','ʋ':'v','Ẃ':'w','ẃ':'w','Ẁ':'w','ẁ':'w','Ŵ':'w','ŵ':'w','W':'w','̊':'w','ẘ':'w','Ẅ':'w','ẅ':'w','Ẇ':'w','ẇ':'w','Ẉ':'w','ẉ':'w','Ẍ':'x','ẍ':'x','Ẋ':'x','ẋ':'x','Ý':'y','ý':'y','Ỳ':'y','ỳ':'y','Ŷ':'y','ŷ':'y','Y':'y','̊':'y','ẙ':'y','Ÿ':'y','ÿ':'y','Ỹ':'y','ỹ':'y','Ẏ':'y','ẏ':'y','Ȳ':'y','ȳ':'y','Ỷ':'y','ỷ':'y','Ỵ':'y','ỵ':'y','ʏ':'y','Ɏ':'y','ɏ':'y','Ƴ':'y','ƴ':'y','Ź':'z','ź':'z','Ẑ':'z','ẑ':'z','Ž':'z','ž':'z','Ż':'z','ż':'z','Ẓ':'z','ẓ':'z','Ẕ':'z','ẕ':'z','Ƶ':'z','ƶ':'z','Ȥ':'z','ȥ':'z','ʐ':'z','ʑ':'z','Ⱬ':'z','ⱬ':'z','Ǯ':'z','ǯ':'z','ƺ':'z','２':'2','６':'6','Ｂ':'B','Ｆ':'F','Ｊ':'J','Ｎ':'N','Ｒ':'R','Ｖ':'V','Ｚ':'Z','ｂ':'b','ｆ':'f','ｊ':'j','ｎ':'n','ｒ':'r','ｖ':'v','ｚ':'z','１':'1','５':'5','９':'9','Ａ':'A','Ｅ':'E','Ｉ':'I','Ｍ':'M','Ｑ':'Q','Ｕ':'U','Ｙ':'Y','ａ':'a','ｅ':'e','ｉ':'i','ｍ':'m','ｑ':'q','ｕ':'u','ｙ':'y','０':'0','４':'4','８':'8','Ｄ':'D','Ｈ':'H','Ｌ':'L','Ｐ':'P','Ｔ':'T','Ｘ':'X','ｄ':'d','ｈ':'h','ｌ':'l','ｐ':'p','ｔ':'t','ｘ':'x','３':'3','７':'7','Ｃ':'C','Ｇ':'G','Ｋ':'K','Ｏ':'O','Ｓ':'S','Ｗ':'W','ｃ':'c','ｇ':'g','ｋ':'k','ｏ':'o','ｓ':'s','ｗ':'w'}

		function accent_fold (s) {
			if (typeof s  != 'string')  return '' 
			var result = ''
			for (var i=0; i<s.length; i++) {
				result += accent_map[s.charAt(i)] || s.charAt(i)
			}
			return result
		}

		icItemStorage.getSearchTag = function(search_term, translationFn ){

			if(typeof search_term != 'string') return null

			search_term = accent_fold(search_term)

			if(!search_term) return null

			var index 		= searchTerms.indexOf(search_term),
				search_tag 	= 'search%1' 

			if(index == -1){


				searchTerms.push(search_term)
				index = searchTerms.length-1

				var regex_array				= 	search_term.split(/\s/).map(function(part){ 
													var regex = undefined
													
													try {
														regex = new RegExp(accent_fold(part), 'i') 
													} catch(e) {
														regex = new RegExp(accent_fold(part).replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), 'i')
													}

													return regex
												}),
					searchable_properties 	= 	ic.itemConfig.properties.filter(function(property){
													return property.searchable
												})


				const matchesString = function(x, regex){


					if(typeof x != 'string') return false

					const str = accent_fold( String(x) )

					if(!str) return false

					const matches_raw = str.match(regex)

					if(matches_raw) return true

					if(typeof translationFn != 'function') return false

					const translated_arr =  (translationFn(x) || []).map( s => accent_fold(s) )

					if(translated_arr.length == 0) return false

					const matches_translation = translated_arr.some( s => s.match(regex) )

					if(matches_translation) return true

					return false

				}	

				icItemStorage.registerFilter(search_tag.replace(/%1/,index), function(item){
					return	regex_array.every(function(regex){
								return searchable_properties.some(function(property){
											switch(property.type){
												case "array": 
													return (item[property.name]||[]).some(sub => matchesString(sub, regex))
												break 

												case "object": 
													return Object.keys(item[property.name]||{}).some(key => matchesString(item[property.name][key], regex) )
												break 

												default:
													return matchesString(item[property.name], regex)
												break
											}
										})
							})

				}) 			
			} 


			return search_tag.replace(/%1/,index)
		}



		var areas = []


		function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
			var R 		= 	6371,
				dLat 	= 	deg2rad(lat2-lat1)
				dLon 	= 	deg2rad(lon2-lon1);
				a 		=	Math.sin(dLat/2) * Math.sin(dLat/2) +
							Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
							Math.sin(dLon/2) * Math.sin(dLon/2),
				c 		= 	2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)),
				d 		= 	R * c

			return d
		}

		function deg2rad(deg) {
			return deg * (Math.PI/180)
		}


		icItemStorage.getAreaTag = function(latitude, longitude, distance){

			var index 		= 	areas.findIndex(function(a){
									return a[0] == latitude && a[1] == longitude && a[3] == distance
								}),	
				area_tag 	= 'area%1' 

			if(index == -1){
				areas.push([latitude, longitude, distance])
				index = areas.length-1


				icItemStorage.registerFilter(area_tag.replace(/%1/,index), function(item){
					return getDistanceFromLatLonInKm(item.latitude, item.longitude, latitude, longitude) <= distance
				})
			}

			return area_tag.replace(/%1/,index)

		}


		//This doesnt seem usefull, but slows down initial laoding
		// icItemStorage.registerSortingCriterium('id', function(item_1, item_2){
		// 	return ( ( item_1.id == item_2.id ) ? 0 : ( ( item_1.id > item_2.id ) ? 1 : -1 ) )
		// })

	}

	window.ic.itemStorage = new IcItemStorage()

}())