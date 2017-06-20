/* global axios, $, moment, _, Opentip, Tipped, Tooltip */

//var baseUrl = "https://www.codewars.com/api/v1/";
var moi = "mn113";		// later need to scrape this from page

// Obtain Codewars API key (locally):
//var secrets = axios.get("js/secret.json").then(resp => resp.data);

function getCompletedKatas(username) {
//	var url = baseUrl + "users/" + username + "/code-challenges/completed";

	axios.get("js/mn113completed.json")
		.then(function(resp) {
			var completedKatas = resp.data.data;
			// Group by date:
			var activeDates = _.countBy(completedKatas, kata => kata.completedAt.substr(0,10));
			// Apply data to calendar day-by-day:
			for (var date of Object.keys(activeDates)) {
				styleDay(date, completedKatas.filter(kata => kata.completedAt.substr(0,10) === date));
			}
		});
}

function styleDay(date, dateKatas) {
	console.log(dateKatas);
	var $div = $(".day[data-date="+date+"]");
	// Count katas
	$div.css({
		opacity: dateKatas.length * 0.1
	});
	// Group by language
	var langs = dateKatas.map(kata => kata.completedLanguages[0]);
	var counts = _.countBy(langs);
	console.log(counts);
	var max = _.sortBy(counts)[0];
	$div.addClass(max);
	// later: mixed bgcolors
}


/*
function getAuthored(username) {

}

function getKata(kataid) {

}
*/

function generateCalendar(target) {
	var now = moment();
	// Find next Sunday:
	var finalDay = now.clone();
	finalDay.endOf("week").add(1, "days");
	// Subtract 52x7:
	var currentDay = finalDay.clone();
	currentDay.subtract(52, "weeks");
	// Prep HTML:
	//var headings = document.getElementById("calendar").innerHTML;
	//var html = headings;
	var $week = $("<section>").addClass("week");
	// Start looping:
	while (currentDay.isBefore(finalDay)) {
		if (currentDay.weekday() === 0)
			$week = $("<section>").addClass("week");
			//html += "<section class='week'>";
		var $div = $("<div>").addClass("day").attr("data-date", currentDay.format("YYYY-MM-DD"));
		$div.appendTo($week);
		//html += "<div class='day' data-date="+currentDay.format("YYYY-MM-DD")+"></div>";
		if (currentDay.weekday() === 6)
			$week.appendTo($(target));
			//html += "</section>";
		currentDay.add(1, "days");
	}
	//document.getElementById(target).innerHTML = html;
}


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
