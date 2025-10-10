// import angular from 'angular'
// import angular_route from 'angular'
// import angular_translate from 'angular'
// import leaflet from 'leaflet'
// import leaflet_marker_cluster from 'leaflet.markercluster'
// import fullcalendar from 'fullcalendar'
// import fullcalendarAllLocales from '@fullcalendar/core/locales-all.cjs'
// import rrule from 'rrule'
	


var angular 					= require('angular'),
	angular_route				= require('angular-sanitize'),
	angular_translate			= require('angular-translate'),
	leaflet						= require('leaflet'),
	leaflet_marker_cluster		= require('leaflet.markercluster'),
	mappo						= require('mappo-aggregato-client'),
	

	//	leaflet_vector_grid			= require('leaflet.vectorgrid'),

	// for calendar:

	// fullcalendar				= require('fullcalendar'),
	// fullcalendarAllLocales		= require('@fullcalendar/core/locales-all.cjs'),

	// rrule
	rrule						= require('rrule')

	// ui_calendar					= require('angular-ui-calendar'),
	// jquery						= require('jquery')

require('leaflet.snogylop')

// window.fullcalendar 	= fullcalendar
window.rrule			= rrule
window.RRule			= rrule.RRule
window.mappo			= mappo


