/* global axios, $, moment, _, Opentip, Tipped, Tooltip */

var langColours = {
	ruby: "firebrick",
	swift: "tomato",
	java: "orange",
	javascript: "yellow",
	clojure: "lawngreen",
	python: "forestgreen",
	dart: "mediumaquamarine",
	cpp: "teal",
	go: "darkturquoise",
	typescript: "dodgerblue",
	fsharp: "steelblue",
	php: "mediumpurple",
	elixir: "blueviolet",
	sql: "purple",
	haskell: "purple",
	csharp: "fuchsia",
	crystal: "black"
};

var user = {
	details: null,
	completedKatas: [],
	authoredKatas: [],
	languageCounts: {}
};


/* FETCH REMOTE DATA */

// Obtain Codewars API key (locally):
//var secrets = axios.get("js/secret.json").then(resp => resp.data);

//var baseUrl = "https://www.codewars.com/api/v1/";
var baseUrl = "http://localhost:5050";

// Fetch user profile from localStorage or CW API:
function getUser(username) {
	if (typeof username === 'undefined') return;

	// Loading spinner:
	$("#user-profile").addClass("loading");

	// Retrieve the kata only if we don't have it stored:
	if (!localStorage.getItem(username)) {
		// API call:
		var url = baseUrl + "/users/" + username;
		return axios.get(url)
			.then(function(resp) {
				console.log("User response", resp);
				// store fetched CodeWars user data on local user object:
				user.details = resp.data;
				renderUser(resp.data);
				// store user locally:
				localStorage.setItem(username, JSON.stringify(resp.data));
				return resp;
			})
			.catch(function(err) {
				console.log(err);
				return false;
			});
	}
	else {
		var userObj = JSON.parse(localStorage.getItem(username));
		user.details = userObj;
		renderUser(userObj);
		return Promise.resolve(userObj);
	}
}

// Fetch current user's completed katas from CW API in multiple pages:
function getCompletedKatas(username, page) {
	if (typeof page === 'undefined') page = 0;
	if (typeof username === 'undefined') return;

	// Retrieve the page of katas only if we don't have it stored:
	if (!localStorage.getItem(username+'-page'+page)) {
		// API call:
		var url = baseUrl + "/users/" + username + "/code-challenges/completed?page=" + page;
		axios.get(url)
			.then(function(resp) {
				localStorage.setItem(username+'-page'+page, JSON.stringify(resp.data.data));
				user.completedKatas = user.completedKatas.concat(resp.data.data);
				handleFetchedKatas(resp.data.data, page, username);
			});
	}
	else {
		// Local fetch:
		var localKatas = JSON.parse(localStorage.getItem(username+'-page'+page));
		user.completedKatas = user.completedKatas.concat(localKatas);
		handleFetchedKatas(localKatas, page, username);
	}
}

// Do stuff with the local- or API-fetched katas:
function handleFetchedKatas(katas, page, username) {
	// Always keep progress message up-to-date:
	var number = (200 * page) + katas.length;
	console.log(number+" katas fetched");
	$(".message").html(number+" katas fetched");

	// When first page loads, stop loading animation and start render:
	if (page === 0) stopCalendarLoadingAnim();

	// Do we have them all?
	if (katas.length < 200) {
		// Count katas per language, for ALL user's katas:
		user.languageCounts = _.countBy(user.completedKatas, kata => kata.completedLanguages[0]);

		// Render final page of katas:
		console.log("Rendering final page", page);
		renderKatas(katas, "", true);

		// Remove blank weeks from calendar start:
		setTimeout(function() {
			console.log("Cropping");
			cropCalendar();		// I HOPE THEY ARE ALL RENDERED BEFORE CROP...
		}, 750);

		// Get individual kata details:
		user.completedKatas.forEach(function(kata) {
			getKataDetails(kata.id);
		});

		makeLegend();
		makeLangRankTable();
	}
	else {
		// Render latest katas:
		console.log("Rendering page", page);
		renderKatas(katas, "", false);
		// Fetch next page of katas from API:
		getCompletedKatas(username, page+1);
	}
}

// Fetch a kata's details from localStorage or CW API:
function getKataDetails(id) {
	// Retrieve the kata only if we don't have it stored:
	if (typeof id !== 'undefined' && !localStorage.getItem(id)) {
		// API call:
		var url = baseUrl + "/code-challenges/" + id;
		return axios.get(url)
			.then(function(resp) {
				console.log("Kata response", resp);
				// Strip long description:
				if (resp.data.description) resp.data.description = '';
				// store id locally:
				localStorage.setItem(id, JSON.stringify(resp.data));
				return resp.data;
			})
			.catch(function(err) {
				console.log(err);
				return false;
			});
	}
	else return JSON.parse(localStorage.getItem(id));	// NOT A PROMISE, BUT DOESN'T MATTER
}


/* FILL USER PROFILE */

// Fill the #user div with user HTML:
function renderUser(details) {
	var $userDiv = $("#user-profile");
	$userDiv.removeClass("loading");
	$userDiv.append($("<h2>").html(details.username));
	$userDiv.append(makeRankPill(details.ranks.overall.name));
	var $dl = $("<dl>");
	var languages = Object.keys(details.ranks.languages);
	$dl.append("<dt>Honor</dt><dd>"+details.honor+' points</dd>');
	$dl.append("<dt>Leaderboard</dt><dd>"+details.leaderboardPosition+'</dd>');
	$dl.append("<dt>Completed kata</dt><dd>"+details.codeChallenges.totalCompleted+"</dd>");
	$dl.append("<dt>Authored kata</dt><dd>"+details.codeChallenges.totalAuthored+"</dd>");
	$dl.append("<dt>Languages</dt><dd>"+languages.join(", ")+"</dd>");
	$userDiv.append($dl);
}


/* DRAW CALENDAR */

// Generate an empty calendar for 208 weeks back from today:
function generateCalendar(target) {
	var today = moment().endOf("day");
	// Find next Sunday:
	var finalDay = today.clone();
	finalDay.endOf("week").add(1, "days");
	// Subtract 2x52x7:
	var currentDay = finalDay.clone();
	currentDay.subtract(208, "weeks");
	// Create week section:
	var $week = $("<section>").addClass("week");
	// Start looping chronologically:
	while (currentDay.isBefore(finalDay)) {
		// Start new week on Sunday:
		if (currentDay.weekday() === 0) $week = $("<section>").addClass("week");
		if (currentDay.date() === 1) $week.addClass(currentDay.format('MMM'));			// First week gets month heading
		if (currentDay.date() === 1 && currentDay.month() === 0) $week.addClass('year'+currentDay.format('YY'));	// January gets extra year heading
		// Create day div:
		var $div = $("<div>").addClass("day").attr("data-date", currentDay.format("YYYY-MM-DD"));
		// Mark today with x:
		if (currentDay.isSame(today)) $div.addClass('today').html('&times;');
		$div.appendTo($week);
		if (currentDay.weekday() === 6) $week.appendTo($(target));
		currentDay.add(1, "days");
	}
	// Scroll to end:
	document.getElementById('calendar').scrollLeft = 99999;

	// Loading animation:
	runCalendarLoadingAnim();
}

// Remove all weeks before earliest kata:
function cropCalendar() {
	while (!$(".week:first-child").find(".tt").length) {
		$(".week:first-child").remove();
		// Leave us with 52 weeks, even if blank:
		if ($(".week").length <= 52) break;
	}
}

// Empty out all calendar cells:
function clearCalendar() {
	$("#calendar .day").removeClass("tt flash-once").css("opacity", 1);
	for (var lang of Object.keys(user.languageCounts)) {
		$("#calendar .day").removeClass(lang);
	}
}

// Start calendar flicker animation:
function runCalendarLoadingAnim() {
	window.loadingLoop = setTimeout(function() {
		var $randomDay = $("#calendar .day").random();
		//console.log($randomDay.data('date'));
		$randomDay.addClass("flash-once");
		runCalendarLoadingAnim();
	}, 200);
}

// Stop calendar flicker animation:
function stopCalendarLoadingAnim() {
	clearTimeout(window.loadingLoop);
}


/* FILL CALENDAR */

// Fill the calendar with a filtered set of katas:
function renderKatas(katas, filter = "", isFinal = false) {
	if (filter.length > 0) {
		katas = katas.filter(kata => kata.completedLanguages.indexOf(filter) !== -1);
		$("canvas").hide();
	}
	else {
		$("canvas").show();	// BETTER TO HIDE ALL CANVASES & JUST USE OPACITY WHEN FILTERED TO A SINGLE LANG?
	}
	// Group by date:
	var activeDates = _.countBy(katas, kata => kata.completedAt.substr(0,10));
	// Apply data to calendar day-by-day:
	console.log("About to style days...");
	for (var date of Object.keys(activeDates)) {
		styleDay(date, katas.filter(kata => kata.completedAt.substr(0,10) === date));
	}

	// DO THIS AFTER EVERYTHING IS FETCHED
	if (isFinal) {
		createCalendarTooltips();
	}
}


/* CALENDAR DAY */

// Render one calendar day's content:
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
	// Insert a small pie chart canvas:
	$div.html(createCanvas(date));
	drawPieOnCanvas(counts, date);
}

// Make a small canvas element:
function createCanvas(id) {
	var $canvas = $("<canvas>")
		.attr("id", "canvas"+id)
		.attr("width", 12)
		.attr("height", 12);
	return $canvas;
}

// Draw a square pie chart of day's katas:
function drawPieOnCanvas(data, date) {
	// Sum the values to find out 100% of this pie chart:
	var dataSum = Object.values(data).reduce(function(acc, val) {
		return acc + val;
	}, 0);

	// Select a tiny canvas:
	var canvas = document.querySelector('#canvas'+date);
	if (!canvas) return;
	var ctx = canvas.getContext('2d'),
		canvasCenterVert = canvas.height / 2,
		canvasCenterHoriz = canvas.width / 2;

	// Make the pie fill the square canvas:
	var radius = canvas.height;
	// Start drawing at 9 o'clock:
	var angle = -Math.PI;
	// Draw a pie segment (filled arc) for each language count:
	for (var key of Object.keys(data)) {
		var arc = 2 * Math.PI * data[key] / dataSum;
		//console.log("Arc", key, "from", angle, "to", angle+arc);
		drawPieSlice(canvasCenterHoriz, canvasCenterVert, radius, angle, angle+arc, false, langColours[key]);
		angle += arc;
	}

	function drawPieSlice(x, y, radius, startAngle, endAngle, direction, fillStyle){
		ctx.beginPath();
		ctx.fillStyle = fillStyle;
		ctx.moveTo(canvasCenterHoriz, canvasCenterVert);
		ctx.arc(x, y, radius, startAngle, endAngle, direction);
		ctx.fill();
	}
}


/* CALENDAR EXTRAS */

// Prepare tooltips for filled calendar days
function createCalendarTooltips() {
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
}

// Fill a tooltip with kata names, ranks and languages:
function makeTooltipContent(kataids) {
	var $ul = $("<ul>").addClass("tt-katas");
	for (var id of kataids) {
		// Lookup id in big kata list:
		var kata = _.find(user.completedKatas, (kata) => kata.id === id);
		// Lookup id in localStorage to get rank:
		var rank = JSON.parse(localStorage.getItem(id)).rank.name;
		// Build html:
		var $li = $("<li>");
		$li.html(makeRankPill(rank));
		// Handle special case for icon display:
		if (kata.completedLanguages[0] === 'shell') kata.completedLanguages[0] = 'bash';
		var $icon = $("<i>")
			.addClass(kata.completedLanguages[0])
			.addClass("icon-moon-"+kata.completedLanguages[0]);
		var $anchor = $("<a>")
			.attr("href", "https://www.codewars.com/kata/"+kata.slug)
			.attr("target", "_blank")
			.html(kata.name);
		//$rank.appendTo($li);
		$icon.appendTo($li);
		$anchor.appendTo($li);
		$li.appendTo($ul);
	}
	return $ul;
}

// Draw the svg icon for a rank:
function makeRankPill(rank) {
	if (!rank) rank = 'beta';
	return "<svg><use xlink:href='img/rankpill.svg#" + rank.replace(' ','-') + "'></use></svg>";
}

// Draw the calendar languages legend:
function makeLegend() {
	for (var lang of Object.keys(user.languageCounts)) {
		var count = user.languageCounts[lang];
		var $li = $("<li>")
			.html(lang +" ("+ count +" katas)");
		// Handle special case for icon display:
		if (lang === 'shell') lang = 'bash';
		var $icon = $("<i>")
			.addClass(lang)
			.addClass("icon-moon-"+lang);
		$icon.prependTo($li);
		$li.appendTo($(".legend"));
	}
	$(".legend").show();
}


/* LANG-RANKS */

var ranks = ['Beta', '8 kyu', '7 kyu', '6 kyu', '5 kyu', '4 kyu', '3 kyu', '2 kyu', '1 kyu'];

// Import mn113's languages-ranks data from local file:
/*
function getLangRankData() {
	var langRankData = [];
	// Read from local json file:
	$.ajax({
		type: "GET",
		url: "kata-ranks-langs.json",
		dataType: "json",
		success: function(data) {
			langRankData = data;
			//console.log(langRankData);
			makeLangRankTable(data);
		}
	});
	// Draw table:
}
*/

// Build out <table> element for all required ranks & languages:
function makeLangRankTable() {
	console.log("makeLRT", user.languageCounts, Object.keys(user.languageCounts));
	var $headerRow = $("#th_langs");
	// Make a row of column headings first:
	for (var lang of Object.keys(user.languageCounts)) {
		console.log(lang);
		$headerRow.append($("<th>").html(lang));
	}
	// Make a row for each rank:
	for (var rank of ranks) {
		var $tr = $("<tr>").html($("<th>").html(rank));
		for (var lang of Object.keys(user.languageCounts)) {
			// Make the empty table cell:
			$tr.append($("<td>").html('0'));
		}
		$("#langRankTable").append($tr);
	}
	fillLanguageRankTable();
}

// Fill <table> with numbers and opacify the cells:
function fillLanguageRankTable() {
	console.log("fillLRT", user.languageCounts);
	for (var kata of user.completedKatas) {
		var kataDetail = getKataDetails(kata.id);
		if (!kataDetail) continue;
		else if (kataDetail.rank && kataDetail.rank.name === null) kataDetail.rank.name = 'Beta';
		// Boost appropriate table cell:
		var x = Object.keys(user.languageCounts).indexOf(kata.completedLanguages[0].toLowerCase());	// only consider one lang per kata
		var y = ranks.indexOf(kataDetail.rank.name);
		var $td = $("#langRankTable").find("tr:nth-child("+(y+2)+")").find("td:nth-child("+(x+2)+")");
		// Increment cell's number:
		$td.html(parseInt($td.html()) + 1);
	}

	// Find max cell value:
	var maxValue = _.chain($("#langRankTable td"))
					.map(td => parseInt($(td).html()))
					.max()
					.value();

	console.log(maxValue+" maximum");

	// Colour cells using opacity:
	$("td").each(function() {
		$(this).css({
			background: 'rgba(200,0,255,'+ parseInt($(this).html()) / maxValue +')'
		});
	});
}


// MAIN EXECUTION STARTS:

function polyfillsAreLoaded() {
	console.log('Polyfills loaded, beginning main function');
	// jQuery has loaded, document too:
	$(document).ready(function() {

		// Display blank calendar no matter what:
		generateCalendar("#calendar");

		var urlParams = new URL(location.href).searchParams;	// needs polyfill for IE8-11

		// Set user from URL string on page load:
		if (urlParams.get('user')) {
			// Check validity by API request:
			var cwUserPromise = getUser(urlParams.get('user'));
			//console.log("User", cwUserPromise);
			// Depends on promise resolving:
			cwUserPromise.then(cwUser => {
				console.log('cwUser', cwUser);
				// Set title:
				if (cwUser) {
					$("h1 input").val(cwUser.username);
					$("h1 input").width($("h1 input").val().length * 20);
					// Start fetching data for calendar:
					getCompletedKatas(cwUser.username);
				}
			});
		}

		// Reload page on username input:
		$("h1 form").on("submit", function(e) {
			e.preventDefault();
			e.stopPropagation();
			// Check validity by API request:
			var cwUserPromise = getUser($("h1 input").val());
			console.log("User", cwUserPromise);
			// Depends on promise resolving:
			cwUserPromise.then(cwUser => {
				// Reload page:
				console.log(cwUser);
				if (cwUser && cwUser.username) {
					window.location.href = window.location.origin + window.location.pathname + '?user=' + cwUser.username;
				}
				else {
					$("h1 input").addClass("invalid");
				}
			});
		});

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

		// Wait, then do langs-ranks work:
		//setTimeout(makeLangRankTable, 2000);

	});
}

// jQuery helper:
$.fn.random = function() {
	return this.eq(Math.floor(Math.random() * this.length));
};
