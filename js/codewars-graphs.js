/* global axios, moment, Opentip */

var baseUrl = "https://www.codewars.com/api/v1/";

function getCompleted(username) {
	var url = baseUrl + "users/" + username + "/code-challenges/completed";

	axios.get(url)
	.then(function (response) {
		console.log(response);
	})
	.catch(function (error) {
		console.log(error);
	});
}

function getAuthored(username) {

}

function getKata(kataid) {

}

function generateCalendar(target) {
	var now = moment();
	// Find next Sunday:
	var finalDay = now.clone();
	finalDay.endOf("week").add(1, "days");
	// Subtract 52x7:
	var currentDay = finalDay.clone();
	currentDay.subtract(52, "weeks");
	// Prep HTML:
	var headings = document.getElementById("calendar").innerHTML;
	var html = headings;
	// Start looping:
	while (currentDay.isBefore(finalDay)) {
		if (currentDay.weekday() === 0) html += "<section class='week'>";
		html += "<div data-date="+currentDay.format("YYYY-MM-DD")+">"+currentDay.format('d')+"</div>";
		if (currentDay.weekday() === 6) html += "</section>";
		currentDay.add(1, "days");
	}
	document.getElementById(target).innerHTML = html;
}
generateCalendar("calendar");
