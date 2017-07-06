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
	username: "mn113",		// later need to scrape this from page
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

	var url = baseUrl + "/users/" + username + "/code-challenges/completed?page=" + page;
	axios.get(url)
		.then(function(resp) {
			user.completedKatas = user.completedKatas.concat(resp.data.data);
			// Do we have them all?
			if (resp.data.data.length < 200) {
				user.languageCounts = _.countBy(resp.data.data, kata => kata.completedLanguages[0]);

				// Stop loading animation and start render:
				stopCalendarLoadingAnim();
				$("#calendar").removeClass("loading");
				renderKatas(user.completedKatas);

				// Get individual kata details:
				user.completedKatas.forEach(function(kata) {
					getKataDetails(kata.id);
				});
				makeLegend();
			}
			else {
				// Get next page of katas from API:
				getCompletedKatas(username, page+1);
			}
		});
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

// Make a small coloured icon:
function renderRankPill(rank) {
	var pillColours = {
		'Beta': 'grey',
		'8 kyu': 'white',
		'7 kyu': 'white',
		'6 kyu': 'yellow',
		'5 kyu': 'yellow',
		'4 kyu': 'blue',
		'3 kyu': 'blue',
		'2 kyu': 'purple',
		'1 kyu': 'purple'
	};
	var $outerDiv = $("<div>").addClass("small-hex is-extra-wide is-invertable is-"+pillColours[rank]+"-rank");
	var $innerDiv = $("<div>").addClass("inner-small-hex is-extra-wide");
	return $outerDiv.append($innerDiv.append($("<span>").html(rank)));
	//	<div class="small-hex is-extra-wide is-invertable is-blue-rank">
	//		<div class="inner-small-hex is-extra-wide ">
	//			<span>3 kyu</span>
	//		</div>
	//	</div>
}


/* DRAW CALENDAR */

// Generate an empty calendar for 52 weeks back from today:
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

	// Loading animation:
	runCalendarLoadingAnim();
	$(target).addClass("loading");
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
function renderKatas(katas, filter = "") {
	if (filter.length > 0) {
		katas = katas.filter(kata => kata.completedLanguages.indexOf(filter) !== -1);
		$("canvas").hide();
	}
	else {
		$("canvas").show();
	}
	// Group by date:
	var activeDates = _.countBy(katas, kata => kata.completedAt.substr(0,10));
	// Apply data to calendar day-by-day:
	for (var date of Object.keys(activeDates)) {
		styleDay(date, katas.filter(kata => kata.completedAt.substr(0,10) === date));
	}

	createCalendarTooltips();
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
		//var $rank = $("<span>")
		//	.addClass(rank)
		//	.html(rank);
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

// Build out <table> element for all required ranks & languages:
function makeLangRankTable(data) {
	var $headerRow = $("#th_langs");
	for (var rank of ranks) {
		// Make a table row with row heading:
		var $tr = $("<tr>").html($("<th>").html(rank));
		for (var lang of Object.keys(user.languageCounts)) {
			// Make a column heading:
			if (rank === 'Beta') $headerRow.append($("<th>").html(lang));
			// Make the empty table cell:
			$tr.append($("<td>").html('0'));
		}
		$("#langRankTable").append($tr);
	}
	fillLanguageRankTable(data);
}

// Fill <table> with numbers and opacify the cells:
function fillLanguageRankTable(data) {
	for (var kata of data) {
		// Boost appropriate table cell:
		var x = Object.keys(user.languageCounts).indexOf(kata.lang.toLowerCase());
		var y = ranks.indexOf(kata.rank);
		var $td = $("#langRankTable").find("tr:nth-child("+(y+2)+")").find("td:nth-child("+(x+2)+")");
		// Increment cell:
		$td.html(parseInt($td.html()) + 1);
	}
	// Colour cells:
	$("td").each(function() {
		$(this).css({
			background: 'rgba(180,0,255,'+ 0.03 * parseInt($(this).html()) +')'
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
			console.log("User", cwUserPromise);
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
			// Check validity by API request:
			var cwUserPromise = getUser($("h1 input").val());
			console.log("User", cwUserPromise);
			// Depends on promise resolving:
			cwUserPromise.then(cwUser => {
				// Reload page:
				console.log(window.location.origin + window.location.pathname + '?user='  + cwUser.data.username);
				if (cwUser) window.location.href = window.location.origin + window.location.pathname + '?user=' + cwUser.username;
				else $("h1 input").addClass("invalid");
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
		setTimeout(getLangRankData, 2000);

	});
}

// jQuery helper:
$.fn.random = function() {
	return this.eq(Math.floor(Math.random() * this.length));
};
