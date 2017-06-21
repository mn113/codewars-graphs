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
		// Mark today with x:
		if (currentDay.isSame(today)) $div.addClass('today').html('&times;');
		$div.appendTo($week);
		if (currentDay.weekday() === 6) $week.appendTo($(target));
		currentDay.add(1, "days");
	}
}

function clearCalendar() {
	$("#calendar .day").removeClass("tt").css("opacity", 1);
	for (var lang of Object.keys(user.languageCounts)) {
		$("#calendar .day").removeClass(lang);
	}
}

var baseUrl = "https://www.codewars.com/api/v1/";

var user = {
	username: "mn113",		// later need to scrape this from page
	completedKatas: [],
	authoredKatas: [],
	languageCounts: {}
};

// Obtain Codewars API key (locally):
//var secrets = axios.get("js/secret.json").then(resp => resp.data);

function getCompletedKatas(username) {
	//var url = baseUrl + "users/" + username + "/code-challenges/completed";
	axios.get("js/mn113completed.json")
		.then(function(resp) {
			user.completedKatas = resp.data.data;
			user.languageCounts = _.countBy(resp.data.data, kata => kata.completedLanguages[0]);
			renderKatas(user.completedKatas);
			makeLegend();
		});
}

function renderKatas(katas, filter = "") {
	if (filter.length > 0) {
		katas = katas.filter(kata => kata.completedLanguages.indexOf(filter) !== -1);
	}
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
	// Extract ids, stringify & store as data-kataids:
	var kataids = dateKatas.map(kata => kata.id);
	$div.data("kataids", kataids.join(","));
	// Group by language:
	var langs = dateKatas.map(kata => kata.completedLanguages[0]);
	var counts = _.countBy(langs);
	//console.log(counts);
	var topLang = _.maxBy(Object.keys(counts), value => counts[value]);
	// Style based on top language:
	$div.addClass(topLang).addClass('tt');
	// later: mixed bgcolors
}

function makeTooltipContent(kataids) {
	var $ul = $("<ul>").addClass("tt-katas");
	for (var id of kataids) {
		// Lookup id in big kata list:
		var kata = _.find(user.completedKatas, (kata) => kata.id === id);
		var $li = $("<li>");
		var $icon = $("<i>")
			.addClass(kata.completedLanguages[0])
			.addClass("icon-moon-"+kata.completedLanguages[0]);
		var $anchor = $("<a>")
			.attr("href", "https://www.codewars.com/kata/"+kata.slug)
			.attr("target", "_blank")
			.html(kata.name);
		$icon.appendTo($li);
		$anchor.appendTo($li);
		$li.appendTo($ul);
	}
	return $ul;
}

function makeLegend() {
	for (var lang of Object.keys(user.languageCounts)) {
		var count = user.languageCounts[lang];
		var $li = $("<li>")
			.html(lang +" ("+ count +" katas)");
		var $icon = $("<i>")
			.addClass(lang)
			.addClass("icon-moon-"+lang);
		$icon.prependTo($li);
		$li.appendTo($(".legend"));
	}
	$(".legend").show();
}


$(document).ready(function() {

	generateCalendar("#calendar");

	getCompletedKatas();

	Tipped.create('.day', function() {
		if (!$(this).hasClass('tt')) return '';
		else return {
			title: moment($(this).data("date")).format("dddd, Do MMMM"),
			content: makeTooltipContent($(this).data("kataids").split(','))
		};
	}, {
		position: 'top',	// ignored!
		skin: 'light'		// ignored!
	}
	);

	// Click filter names to render a filtered calendar of katas:
	$("#language-filter li").on("click", function() {
		var filter = $(this).data("filter");
		console.log("Filtering by", filter);
		clearCalendar();
		renderKatas(user.completedKatas, filter);
		// Move selected class:
		$("#language-filter li").removeClass("selected");
		$(this).addClass("selected");
	});
});
