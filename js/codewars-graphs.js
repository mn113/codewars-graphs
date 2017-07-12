/* global axios, $, moment, _, Tipped */

var langColours = {
	coffeescript: "saddlebrown",
	ruby: "firebrick",
	crystal:  "indianred",
	swift:  "tomato",
	ocaml:  "coral",
	java:  "orange",
	javascript: "yellow",
	shell:  "olive",			// bash
	clojure:  "lawngreen",
	python: "forestgreen",
	dart:  "mediumaquamarine",
	cpp:  "teal",		// cplusplus
	go:  "darkturquoise",
	typescript:  "dodgerblue",
	fsharp:  "steelblue",
	objc:  "lightblue",
	c:  "blue",	// c-lang
	lua:  "navy",
	php:  "mediumpurple",
	elixir:  "blueviolet",
	sql:  "purple",
	haskell:  "purple",
	csharp:  "fuchsia"
};

var ranks = ['Beta', '8 kyu', '7 kyu', '6 kyu', '5 kyu', '4 kyu', '3 kyu', '2 kyu', '1 kyu'];

var user = {
	details: null,
	completedKatas: [],
	authoredKatas: [],
	languageCounts: {},
	submissionTimes: [],
	fetchCounts: {
		katas: 0,
		ApiKataDetails: 0,
		localKataDetails: 0
	}
};


/* FETCH REMOTE DATA */

// Obtain Codewars API key (locally):
//var secrets = axios.get("js/secret.json").then(resp => resp.data);

//var baseUrl = "https://www.codewars.com/api/v1/";	// original API server
//var baseUrl = "http://localhost:5050";			// dev proxy server
var baseUrl = "https://cwapi.marthost.uk";			// live proxy server

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
function getKatas(username, page = 0) {
	//if (typeof page === 'undefined') page = 0;
	if (typeof username === 'undefined') return;

	// Retrieve the page of katas only if we don't have it stored:
	if (!localStorage.getItem(username+'-page'+page)) {
		// API call:
		var url = baseUrl + "/users/" + username + "/code-challenges/completed?page=" + page;
		axios.get(url)
			.then(function(resp) {
				// Cache page:
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
	user.fetchCounts.katas += katas.length;
	//var number = (200 * page) + katas.length;
	$(".message span:first-child").html(user.fetchCounts.katas+" of "+user.details.codeChallenges.totalCompleted+" user katas fetched.");

	// Do we have them all?
	if (katas.length < 200) {
		// Count katas per language, for ALL user's katas:
		var langs = _.flatten(_.map(user.completedKatas, kata => kata.completedLanguages));
		user.languageCounts = _.countBy(langs);
		console.log(user.languageCounts);
		//user.languageCounts = _.countBy(user.completedKatas, kata => kata.completedLanguages[0]);

		// Render final page of katas:
		console.log("Rendering final page", page);
		renderKatas(katas, "", true);

		// Remove blank weeks from calendar start:
		setTimeout(function() {
			console.log("Cropping calendar start");
			cropCalendar();		// I HOPE THEY ARE ALL RENDERED BEFORE CROP...
		}, 750);

		// Get individual kata details:
		katas.forEach(function(kata) {
			getKataDetails(kata.id);
		});

		makeLegend();
		makeLangRankTable();
		mapTimes();
	}
	else {
		// Render latest katas:
		console.log("Rendering page", page);
		renderKatas(katas, "", false);
		// Fetch next page of katas from API:
		getKatas(username, page+1);
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
				//console.log("Kata response", resp);
				// Strip long description:
				if (resp.data.description) resp.data.description = '';
				// Store locally using id as key:
				localStorage.setItem(id, JSON.stringify(resp.data));
				// Message:
				user.fetchCounts.ApiKataDetails++;
				$(".message span:nth-child(2)").html(user.fetchCounts.ApiKataDetails + " kata details fetched.");
				return resp.data;
			})
			.catch(function(err) {
				console.log(err);
				return false;
			});
	}
	else {
		user.fetchCounts.localKataDetails++;
		$(".message span:last-child").html(user.fetchCounts.localKataDetails + " locally-stored details known.");
		return Promise.resolve(JSON.parse(localStorage.getItem(id)));
	}
}


/* FILL USER PROFILE */

// Fill the #user div with user HTML:
function renderUser(details) {
	var $userDiv = $("#user-profile");
	$userDiv.removeClass("loading");
	$userDiv.html($("<h2>").html(details.username));
	$userDiv.append(makeRankPill(details.ranks.overall.name));
	var $dl = $("<dl>");
	var languages = Object.keys(details.ranks.languages);
	$dl.append("<dt>Honor</dt><dd>"+details.honor+' points</dd>');
	$dl.append("<dt>Leaderboard</dt><dd>#"+details.leaderboardPosition+'</dd>');
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
		var $randomDay = $("#calendar .day:not(.tt)").random();
		//console.log($randomDay.data('date'));
		$randomDay.addClass("flash-once");
		runCalendarLoadingAnim();
	}, 100);
}

// Stop calendar flicker animation:
function stopCalendarLoadingAnim() {
	clearTimeout(window.loadingLoop);
}


/* FILL CALENDAR */

// Fill the calendar with a filtered set of katas:
function renderKatas(katas, filter = "", isFinal = false, newCanvas = true) {		// ES6 default prop (polyfilled)
	// Filter katas:
	if (filter.length > 0) {
		katas = katas.filter(kata => kata.completedLanguages.indexOf(filter) !== -1);
	}

	// Group by date:
	var activeDates = _.countBy(katas, kata => kata.completedAt.substr(0,10));
	// Apply data to calendar day-by-day:
	console.log("About to style days...");
	for (var date of Object.keys(activeDates)) {
		styleDay(date, katas.filter(kata => kata.completedAt.substr(0,10) === date), filter, newCanvas);
	}

	// Hide all pies when filtering to specific language, show all when all:
	if (filter.length > 0) $("#calendar canvas").hide();
	else $("#calendar canvas").show();

	// Post-finalblock-render operations:
	if (isFinal) {
		$(".message").addClass("success");
		stopCalendarLoadingAnim();
		makeFilters();
		createCalendarTooltips();
	}
}

// Generate the filter activation links:
function makeFilters() {
	for (var lang of Object.keys(user.languageCounts)) {
		var $li = $("<li>").data('filter', lang).html(lang);
		$li.appendTo($("#language-filter"));
	}
}

// Show only the <li>s in the tooltips for the filtered language:
function filterTooltips(filter) {
	if (filter.length > 0) {
		$(".tt-katas li").hide();
		$(".tt-katas li."+filter).show();
	}
	else {
		$(".tt-katas li").show();
	}
}


/* CALENDAR DAY */

// Render one calendar day's content:
function styleDay(date, dateKatas, filter = '', newCanvas = true) {
	// Get element to style:
	var $div = $(".day[data-date="+date+"]");

	// Remove all language classes:
	$div.removeClass().addClass('day');

	// Group input katas by language:
	var langs = _.flatten(dateKatas.map(kata => kata.completedLanguages));
	var dayCounts = _.countBy(langs);

	// Decide on day's background colour:
	if (filter.length === 0) {
		// Style based on top language (as fallback in case of no canvas):
		var topLang = _.maxBy(Object.keys(dayCounts), value => dayCounts[value]);
		$div.addClass(topLang);
	} else {
		// Style as per filtering language:
		$div.addClass(filter);
	}

	// Style background based on kata quantity:
	$div.css({opacity: dateKatas.length * 0.2});

	// Attach tooltips:
	$div.addClass('tt');

	// First time it renders:
	if (newCanvas) {
		// Extract ids, stringify & store as data-kataids:
		var kataids = dateKatas.map(kata => kata.id);
		$div.data("kataids", kataids.join(","));

		// Insert a small pie chart canvas:
		$div.html(createCanvas(date));
		drawPieOnCanvas(dayCounts, date);
	}
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
		position: 'top'
	}
	);
}

// Build a list of kata names, ranks and languages:
function makeTooltipContent(kataids) {
	var $ul = $("<ul>").addClass("tt-katas");
	for (var id of kataids) {
		// Start building html:
		var $li = $("<li>").attr("id", "tt"+id);
		// Insert fake svg:
		$li.append(makeRankPill(null));

		// Lookup id in big kata list:
		var basicKata = _.find(user.completedKatas, (kata) => kata.id === id);

		// Concatenate lang icons:
		var $icons = $("<span>");
		for (var lang of _.uniq(basicKata.completedLanguages)) {
			// Add multiple language classes to li:
			$li.addClass(lang);
			var $icon = $("<i>")
				.addClass(lang)
				.addClass("icon-moon-"+lang);
			$icon.appendTo($icons);
		}
		// Add link:
		var $anchor = $("<a>")
			.attr("href", "https://www.codewars.com/kata/"+basicKata.slug)
			.attr("target", "_blank")
			.html(basicKata.name);

		// Build all together:
		$icons.appendTo($li);
		$anchor.appendTo($li);
		$li.appendTo($ul);

		// Lookup id in localStorage to get real rank:
		var kataDetails = getKataDetails(id);	// Promise
		kataDetails.then(kata => {
			// Replace fake rank pill:
			$("#tt"+kata.id).children("svg").replaceWith(makeRankPill(kata.rank.name));
		});
	}
	return $ul;
}

// Draw the svg icon for a rank:
function makeRankPill(rank) {
	if (!rank) rank = 'beta';
	return "<svg class='pill'><use xlink:href='img/rankpill.svg#" + rank.replace(' ','-') + "'></use></svg>";
}

// Draw the calendar languages legend:
function makeLegend() {
	for (var lang of Object.keys(user.languageCounts)) {
		var count = user.languageCounts[lang];
		var $li = $("<li>")
			.html(lang +" ("+ count +" katas)");
		var $icon = $("<i>")
			.addClass(lang)
			.addClass("icon-moon-"+lang);
		$icon.prependTo($li);
		$li.appendTo($("#legend"));
	}
	$("#legend").show();
}


/* LANG-RANKS */

// Build out <table> element for all required ranks & languages:
function makeLangRankTable() {
	console.log("makeLRT", user.languageCounts, Object.keys(user.languageCounts));
	var $headerRow = $("#th_langs");
	// Make a row of column headings first:
	for (var lang of Object.keys(user.languageCounts)) {
		$headerRow.append($("<th>").html(lang));
	}
	// Make a row for each rank:
	for (var rank of ranks) {
		var $tr = $("<tr>").html($("<th>").html(rank));
		for (lang of Object.keys(user.languageCounts)) {
			// Make the empty table cell:
			$tr.append($("<td>").html('0'));
		}
		$("#langRankTable").append($tr);
	}
	fillLangRankTable();
}

// Fill <table> with numbers:
function fillLangRankTable() {
	console.log("fillLRT", user.languageCounts);
	var filledCells = 0;
	// Map each basic promise to an object with the details added as a Promise
	var promises = user.completedKatas.map(kata => {
		return {
			basic: kata,
			detailed: getKataDetails(kata.id)
		};
	});

	promises.forEach(kataObject => {
		//var kataDetailPromise = getKataDetails(kata.id);	// Promise (pending)
		kataObject.detailed.then(kataDetail => {
			if (typeof kataDetail.rank === 'undefined') return;	// skip faulty data
			// null rank => Beta:
			var rank = (kataDetail.rank.name === null) ? 'Beta' : kataDetail.rank.name;
			if (typeof rank !== 'undefined') {
				// Boost appropriate table cell:
				var x = Object.keys(user.languageCounts).indexOf(kataObject.basic.completedLanguages[0].toLowerCase());	// only consider one lang per kata
				var y = ranks.indexOf(rank);
				var $td = $("#langRankTable").find("tr:nth-child("+(y+2)+")").find("td:nth-child("+(x+2)+")");
				// Increment cell's number:
				$td.html(parseInt($td.html()) + 1);
				filledCells++;
			}
		})
		.catch(err => {
			console.log(kataObject.basic, err);
		});
	});

	Promise.all(promises).then(() => {
		console.log("Added "+filledCells+" async katas to langRankTable");
		colourLangRankTable();
	});
	console.log("Added "+filledCells+" katas to langRankTable");	// ASYNC PROBLEM
	addSkillsToLangRankTable();
}

// Colour table cells and vary opacity:
function colourLangRankTable() {
	// Find max cell value:
	var maxValue = _.chain($("#langRankTable td"))
					.map(td => parseInt($(td).html()))
					.max()
					.value();

	console.log(maxValue+" maximum cell value");

	// Colour cells using opacity:
	$("td").each(function() {
		$(this).css({
			background: 'rgba(200,0,255,'+ parseInt($(this).html()) / maxValue +')'
		});
	});
}

// Make a final table row containing rank pills:
function addSkillsToLangRankTable() {
	var rankedLangs = user.details.ranks.languages;
	// Make row with row heading:
	var $tr = $("<tr>").append($("<th>").html("user skill"));
	// Locate kyu rank for each column heading:
	$("#th_langs th").each(function(index, th) {
		if (index > 0) {
			var langName = $(th).html();
			// Not all the columns possess an average ranking:
			if (Object.keys(rankedLangs).indexOf(langName) !== -1) {
				var rank = rankedLangs[langName].name;
				$tr.append($("<td>").html(makeRankPill(rank)));
			}
			else {
				$tr.append($("<td>"));
			}
		}
	});
	$("#langRankTable").append($("<tfoot>").append($tr));
}


/* TIME MAP */

function mapTimes() {
	// Set up 7 x 24 data structure:
	for (var i = 0; i < 7; i++) {
		user.submissionTimes.push([]);
		for (var j = 0; j < 24; j++) {
			user.submissionTimes[i].push(0);
		}
	}
	// Extract the timeslot data from completedKatas list:
	for (var kata of user.completedKatas) {
		var day = moment(kata.completedAt).day();
		var timeslot = moment(kata.completedAt).hour();
		user.submissionTimes[day][timeslot] += 1;
	}
	console.log(user.submissionTimes);
	// Find maximum value:
	var maxCell = _.max(_.flatten(user.submissionTimes));

	// Draw a chart:
	var canvas = $('#submissionTimes').children('canvas')[0],
		ctx = canvas.getContext('2d'),
		x = canvas.width / 2,
		y = canvas.height / 2;
	ctx.imageSmoothingQuality = 'high';
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = 'teal';
	ctx.font = '40px sans-serif';
	ctx.fillText('★', x-20, y+13);

	// Loop days & hours to render cells:
	for (i = 0; i < 7; i++) {
		for (j = 0; j < 24; j++) {
			renderArcBox(i, j, user.submissionTimes[i][j] / maxCell);	// NEED TO NORMALISE OPACITY
		}
	}

	// Labels
	ctx.globalAlpha = 1;
	ctx.font = '15px sans-serif';
	ctx.fillText('Sun', 230, 45);
	ctx.fillText('Sat', 230, 70);
	ctx.fillText('Fri', 230, 95);
	ctx.fillText('Thu', 230, 120);
	ctx.fillText('Wed', 230, 145);
	ctx.fillText('Tue', 230, 170);
	ctx.fillText('Mon', 230, 195);
	// Labels
	ctx.fillStyle = '#333';
	ctx.fillText('midnight', 200, 20);
	ctx.fillText('3am', 370, 80);
	ctx.fillText('6am', 420, 230);
	ctx.fillText('9am', 370, 380);
	ctx.fillText('noon', 210, 445);
	ctx.fillText('3pm', 55, 380);
	ctx.fillText('6pm', 0, 230);
	ctx.fillText('9pm', 55, 80);


	function renderArcBox(outset, angle, opacity) {
		var thickness = 25,
			innerRadius = 25 + (outset * thickness),
			startAngle = (angle * Math.PI / 12) - Math.PI / 2,	// North == midnight
			endAngle = startAngle + Math.PI / 12;

		// Commence drawing arc box:
		ctx.beginPath();
		ctx.arc(x, y, innerRadius, startAngle, endAngle, false);			// cw arc
		ctx.arc(x, y, innerRadius+thickness, endAngle, startAngle, true);	// ccw arc
		ctx.globalAlpha = opacity;
		ctx.fill();
		ctx.globalAlpha = 0.3;
		ctx.stroke();
		ctx.closePath();
	}
	$('#submissionTimes').show();
}


// MAIN EXECUTION STARTS:

function polyfillsAreLoaded() {
	console.log('Polyfills loaded, beginning main function');
	// jQuery has loaded, document too:
	$(document).ready(function() {

		// Set user from URL string on page load:
		var urlParams = new URL(location.href).searchParams;	// needs polyfill for IE8-11
		var username = urlParams.get('user') || 'mn113';
		// Check validity by API request:
		var cwUserPromise = getUser(username);
		// Depends on promise resolving:
		cwUserPromise.then(cwUser => {
			console.log('cwUser', cwUser);
			// Set title:
			if (cwUser) {
				$("h1 input").val(cwUser.username);
				$("h1 input").width($("h1 input").val().length * 20);
				// Start fetching data for calendar:
				getKatas(cwUser.username);
				//getKatas(cwUser.username, 'authored');
			}
		});

		// Display blank calendar no matter what:
		generateCalendar("#calendar");

		// Reload page on username input:
		$("h1 form").on("submit", function(e) {
			e.preventDefault();
			e.stopPropagation();
			// Check validity by API request:
			var cwUserPromise = getUser($("h1 input").val());
			// Depends on promise resolving:
			cwUserPromise.then(cwUser => {
				$("#user-profile").removeClass("loading");
				// Reload page:
				console.log(cwUser);
				if (cwUser && cwUser.username) {
					window.location.href = '?user=' + cwUser.username;
				}
				else {
					$("h1 input").addClass("invalid");
				}
			})
			.catch(err => {
				console.log("Couldn't load specified user.", err);
				$("h1 input").addClass("invalid");
			});
		});

		// Click filter names to render a filtered calendar of katas:
		$("#language-filter").on("click", "li", function() {
			var filter = $(this).data("filter");
			console.log("Filtering by", filter);
			clearCalendar();
			renderKatas(user.completedKatas, filter, false);	// don't regenerate canvas pies
			filterTooltips(filter);
			// Move selected class:
			$("#language-filter li").removeClass("selected");
			$(this).addClass("selected");
		});

	});
}

// jQuery helper:
$.fn.random = function() {
	return this.eq(Math.floor(Math.random() * this.length));
};
