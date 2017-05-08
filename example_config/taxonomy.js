(function(exports){

	exports.categories = [
		{
			name:		'information',
			tags:		[	
							"health",
							"education",
							"leisure",
							"abc",
							"education",
							"leisure",
							"culture",
							"services",
						],
			colors:		['hsla(99,48%,60%,1)', 'hsla(99,28%,38%,1)']
		},
		{
			name:		'goods',
			tags:		[
							"information",
							"law",
							"work",
							"education",
							"social",
							"leisure",
							"city",
							"services",
						],
			colors:		['hsla(40,48%,60%,1)', 'hsla(40,28%,38%,1)']

		},
		{
			name:		'health',
			tags:		[
							"law",
							"places",
							"support",
							"health",
							"education",
							"leisure",
							"culture",
							"services",
							"events"
						],
			colors:		['hsla(50,48%,60%,1)', 'hsla(50,28%,38%,1)']
		},
		{
			name:		'leisure',
			tags:		[
							"support",
							"health",
							"work",
							"education",
							"social",
							"leisure",
							"culture",
							"city",
						],
			colors:		['hsla(10,48%,60%,1)', 'hsla(10,28%,38%,1)']
		},
		{
			name:		'quaters',
			tags:		[
							"places",
							"support",
							"health",
							"education",
							"culture",
							"city",
							"events"
						],
			colors:		['hsla(66,48%,60%,1)', 'hsla(66,28%,38%,1)']
		}
	]
}(
	('undefined' !== typeof exports) 
	? exports
	: (this['ic'] = this['ic'] || {})['taxonomy'] = (this['ic']['taxonomy'] || {})
))
