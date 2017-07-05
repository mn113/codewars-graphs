const http = require('http');
const fetch = require('node-fetch');

var server = http.createServer(function(req, res) {

	// Set CORS headers
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Request-Method', '*');
	res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
	res.setHeader('Access-Control-Allow-Headers', '*');

	// CODEWARS API ENDPOINTS == MY LOCAL PROXY ENDPOINTS
	// /users/:id_or_username
	// /users/:id_or_username/code-challenges/completed?page=0
	// /users/:id_or_username/code-challenges/authored
	// /code-challenges/:id_or_slug

	const baseUrl = "https://www.codewars.com/api/v1";

	// Proxy the local request to the Codewars API:
	var fetched = fetch(baseUrl+req.url);

	// Text for the requester:
	fetched.then(response => response.text())
			.then(text => res.end(text))
			.catch(err => res.end(err));

	// JSON for the console:
	fetched.then(response => {
		console.log(baseUrl+req.url);
		console.log(response.status, response.statusText);
		//return response.json();	// can't use both .text and .json
	})
	//.then(json => console.log(json))
	.catch(err => console.log(err));

});

console.log("listening on http://localhost:5050");
server.listen(5050);
