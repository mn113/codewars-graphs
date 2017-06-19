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
	// Find next Saturday
	var now = moment();
	var currentDay = now.clone();
	currentDay.endOf("week").subtract(1, "days");
	// Subtract 52x7
	currentDay.subtract(52, "weeks");
	// Start looping
	var html = "";
	while (currentDay.isBefore(now)) {
		console.log(currentDay.format("dddd, MMMM Do YYYY"));
		if (currentDay.weekday() === 0) html += "<section class='week'>";
		html += "<div data-date="+currentDay.format("dddd, MMMM Do YYYY")+"></div>";
		if (currentDay.weekday() === 6) html += "</section>";
		currentDay.add(1, "days");
	}
	target.html(html);
}
generateCalendar();
