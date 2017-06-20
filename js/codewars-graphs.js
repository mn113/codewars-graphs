/* global axios, $, moment, _, Opentip, Tipped, Tooltip */

function generateCalendar(target) {
	var today = moment().endOf("day");
	// Find next Sunday:
	var finalDay = today.clone();
	finalDay.endOf("week").add(1, "days");
	// Subtract 52x7:
	var currentDay = finalDay.clone();
	currentDay.subtract(52, "weeks");
	// Create week section:
	var $week = $("<section>").addClass("week");
	// Start looping chronologically:
	while (currentDay.isBefore(finalDay)) {
		if (currentDay.date() === 1) $week.addClass(currentDay.format('MMM'));
		if (currentDay.weekday() === 0) $week = $("<section>").addClass("week");
		// Create day div:
		var $div = $("<div>").addClass("day").attr("data-date", currentDay.format("YYYY-MM-DD"));
		// TODO: Load tooltip here?
		// Mark today with x:
		if (currentDay.isSame(today)) $div.addClass('today');
		$div.appendTo($week);
		if (currentDay.weekday() === 6) $week.appendTo($(target));
		currentDay.add(1, "days");
	}
}

//var baseUrl = "https://www.codewars.com/api/v1/";
var moi = "mn113";		// later need to scrape this from page

// Obtain Codewars API key (locally):
//var secrets = axios.get("js/secret.json").then(resp => resp.data);

function getCompletedKatas(username) {
//	var url = baseUrl + "users/" + username + "/code-challenges/completed";

	axios.get("js/mn113completed.json")
		.then(function(resp) {
			renderKatas(resp.data.data);
		});
}

function renderKatas(katas) {
	// Group by date:
	var activeDates = _.countBy(katas, kata => kata.completedAt.substr(0,10));
	// Apply data to calendar day-by-day:
	for (var date of Object.keys(activeDates)) {
		styleDay(date, katas.filter(kata => kata.completedAt.substr(0,10) === date));
	}
}

function styleDay(date, dateKatas) {
	// Element to style:
	var $div = $(".day[data-date="+date+"]");
	// Style based on quantity:
	$div.css({
		opacity: dateKatas.length * 0.2
	});
	// Group by language:
	var langs = dateKatas.map(kata => kata.completedLanguages[0]);
	var counts = _.countBy(langs);
	console.log(counts);
	var topLang = _.maxBy(Object.keys(counts), value => counts[value]);
	// Style based on top language:
	$div.addClass(topLang);
	// later: mixed bgcolors
}


/*
function getAuthored(username) {

}

function getKata(kataid) {

}
*/


$(document).ready(function() {

	generateCalendar("#calendar");

	getCompletedKatas();

	Tipped.create('.day',
		function(element) {
			console.log(element);
			return "D" + $(element).data("date");	// undefined
		}, {
			skin: 'light',
			position: 'top'
		}
	);

/*	Tipped.create('#calendar div', {
		position: 'top',
		content: 'x',
		onShow: function(content, element) {
			$(element).addClass('highlight');
		},
		afterHide: function(content, element) {
			$(element).removeClass('highlight');
		}
	});
*/

});
