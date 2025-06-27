"use strict";

(function(){
	if(!icConfig) console.error('icItemDpd: missing icConfig. Should have been added by build process.')	
	if(!(window.ic && window.ic.itemConfig)) 	console.error('icItemDpd: missing ic.itemConfig. Please load item_config.js.')


	function IcItem(item_data){


		var icItem = this

		icItem.internal 			= icItem.internal || {}
		icItem.internal.downloading = undefined

		icItem.importData = function(data){

			//There are no partial imports! If a property is not in data, then the default value is assumed or the value deleted!

			if(!data){
				console.warn('icItemDpd: .importData() called without any data.')
				return icItem
			}

			ic.itemConfig.properties.forEach(function(property){

				// object
				if(property.type == 'object'){
					
					if(!data[property.name] && (property.mandatory || property.defaultValue === null) ){
						icItem[property.name] = angular.copy(property.defaultValue)
						return null
					}

					icItem[property.name] = {}

					for(var key in data[property.name]) {
						if(data[property.name][key] !== undefined) icItem[property.name][key] = data[property.name][key]
					}

					return null
				}

				// array
				if(property.type == 'array'){
					
					if(property.mandatory && !data[property.name]){
						icItem[property.name] = angular.copy(property.defaultValue)
						return null
					}

					icItem[property.name] = []

					;(data[property.name] || []).forEach(function(x){
						if(icItem[property.name].indexOf(x) == -1) icItem[property.name].push(x)
					})
					return null
				}


				// string or number
				icItem[property.name] = data[property.name] || (property.mandatory ? angular.copy(property.defaultValue) : undefined)


				if(property.type == "number"){
					icItem[property.name] = parseFloat(String(icItem[property.name]).replace(/,/, '.'))
				}

			})

			return icItem
		}


		icItem.diff = function(key, data, lang){
			const property = ic.itemConfig.properties.find( property => property.name == key)

			if(!property) return true			

			const value = icItem[key]

			if(!value && !data) return false
			if( value && !data)	return true
			if(!value &&  data) return true

			if(property.translatable){
				
				const langs = 	lang
								?	[lang]
								:	[...Object.keys(value), ... Object.keys(data) ]

				return 	langs.some( l => {

							if(typeof value[l] != 'string' && typeof data[l] != 'string') return false
							if(typeof value[l] == 'string' && typeof data[l] != 'string') return true
							if(typeof value[l] != 'string' && typeof data[l] == 'string') return true

							return value[l].trim() != data[l].trim()

						})
			}

			if(property.type == 'string'){

				if(typeof value != 'string' && typeof data != 'string') return false
				if(typeof value == 'string' && typeof data != 'string') return true
				if(typeof value != 'string' && typeof data == 'string') return true

				return value.trim() != data.trim()
			} 	

			if(property.type == 'array')	return value.some( v => !data.includes(v)) || data.some( d => !value.includes(d) )		

			if(property.type == 'number')	return parseFloat(value) != parseFloat(data)

			return value != data	
		}

		icItem.exportData = function(name, key){
			var data = {}

			ic.itemConfig.properties.forEach(function(property){ 
				if(property.internal) return null

				if(!name || name == property.name){
					if(!key){
						data[property.name] 		=  	icItem[property.name] || null
					} else {
						data[property.name] 		= 	{}
						data[property.name][key]	= 	icItem[property.name][key]
					}
				}
			})


			return data
		}

		icItem.download = function(){
			if(!icItem.id) console.error('icItemDpd.download: missing item id.')

			icItem.internal = 	icItem.internal || {}

			if(icItem.internal.downloading && icItem.internal.ongoingDownload) return icItem.internal.ongoingDownload

			icItem.internal.failed = false	

			icItem.internal.downloading 		= 	true
			icItem.internal.ongoingDownload 	= 	icBackend
													.getItem(icItem.id)
													.then(icItem.importData)
													.then(
														() => {
															icItem.internal.downloading	= false
															icItem.internal.failed 		= false
															return icItem
														},
														(reason) => {
															console.warn('icItem.download(): update failed.', reason)
															icItem.internal.failed 		= true
														}
													)

			return icItem.internal.ongoingDownload
		}

		icItem.update = function(key, subkey){
			if(!icItem.id) console.error('icItemDpd.update: missing item id.')

			const item_data = 	icItem.exportData(key, subkey)

			return 	icBackend.updateItem(icItem.id, item_data)
		}


		icItem.submitAsNew = function(suggestionMeta){

			const raw_data 		= icItem.exportData() 
			
			let clean_data		= {}

			Object.entries(raw_data).forEach( ([key, value]) => {
				const property = ic.itemConfig.properties.find( prop => prop.name == key)

				if(!property) 			return null
				if(property.internal) 	return null

				clean_data[key] = value
			})

			clean_data.suggestionMeta = suggestionMeta

			return	icBackend
					.createItem(clean_data)
					.then(function(data){
						icItem.importData(data)
						return data
					})
		}

		icItem.getDiffData = function(original){

			var raw_data 		= icItem.exportData()
				diff_data	= {}

			Object.keys(raw_data).forEach( key => {

				const property = ic.itemConfig.properties.find( prop => prop.name == key)

				if(!property) 			return null
				if(property.internal)	return null
		
				if(!icItem.diff(key, original[key]))	return null

				diff_data[key] = raw_data[key]

			})

			return diff_data
	
		}


		icItem.submitAsEditSuggestion = function(original, suggestionMeta){

			
			data				= 	original
									?	icItem.getDiffData(original)
									:	icItem.exportData()

			data.state			= 	"suggestion"
			data.proposalFor 	= 	original 
									?	original.id
									:	icItem.id

			data.suggestionMeta = suggestionMeta						



			return	icBackend
					.createItem(clean_data)
					.then(function(data){
						//icItem.importData(data)
						return data
					})
		}


		icItem.delete = function(){
			return 	icBackend
					.deleteItem(icItem.id)
					.then( ({count}) => count ? Promise.resolve(count) : Promise.reject('count == 0, nothing deleted.'+count))
		}

		icItem.getErrors = function(property_name, key){

			var errors	= 	ic.itemConfig.properties.reduce(function(errors, property){
								if(!property || property_name == property.name){
									var e = property.getErrors(icItem[property.name], key)
									if(e) errors[property_name] = e
								}
								return errors
							}, {})

			if(Object.keys(errors).length == 0) return null

			return	property_name
					?	errors[property_name]
					:	errors

		}



		if(item_data && item_data.id){
			icItem.id = item_data.id 
			return icItem.importData(item_data)
		} else {
			console.error('icItemDpd: missing item id.')
			return null
		}

	}


	window.ic.Item = IcItem
}())


