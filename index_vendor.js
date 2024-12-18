"use strict";
	
var angular 					= require('angular'),
	angular_route				= require('angular-sanitize'),
	angular_translate			= require('angular-translate'),
	leaflet						= require('leaflet'),
	leaflet_marker_cluster		= require('leaflet.markercluster'),


	//	leaflet_vector_grid			= require('leaflet.vectorgrid'),

	// for calendar:

	fullcalendar				= require('fullcalendar'),
	fullcalendarAllLocales		= require('@fullcalendar/core/locales-all.cjs'),

	// rrule
	rrule						= require('rrule')

	// ui_calendar					= require('angular-ui-calendar'),
	// jquery						= require('jquery')


window.fullcalendar 	= fullcalendar
window.rrule			= rrule
window.RRule			= rrule.RRule

