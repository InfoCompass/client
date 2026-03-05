onmessage = function(e){

	//e.data must be an array of objects {id: ... , property: ... }


	var data 	= e.data && e.data.data 	|| [],
		type	= e.data && e.data.type 	|| 'alphabetical',
		param	= e.data && e.data.param 	|| null,
		result	= {}

	console.log('sorting worker ', type, param, '...')

	switch(type){
		case 'alphabetical':	data.sort(function(a,b){
									return a.property.trim().localeCompare( b.property.trim(), param || 'en')
								})
		break
	}

	data.forEach(function(item, index){
		result[item.id] = index
	})

	postMessage(result)
	console.log('sorting worker done!', type, param)
	
}