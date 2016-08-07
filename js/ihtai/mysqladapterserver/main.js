var http = require("http")
var ws = require("nodejs-websocket")
var fs = require("fs")
var finalhandler = require('finalhandler');
var serveStatic = require('serve-static');
var serve = serveStatic("./");
var mysql = require('mysql');

var mysqlConnection = mysql.createConnection({
  user     : 'root',
  password : 'bianco',
  database : 'ihtai'
});

var server = ws.createServer(function (connection) {
	connection.nickname = null
	connection.on("text", function (str) {
		if (connection.nickname === null) {
			connection.nickname = str
			broadcast(str+" entered")
		} else {

			///////////
			mysqlConnection.query('CREATE TABLE ' + str + '(PersonID int);', function(err, rows, fields) {
			
			  if (err) throw err;
			  // console.log('The solution is: ', rows[0].solution);
			});
			////////////

			broadcast("["+connection.nickname+"] "+str)
		}
	})
	connection.on("close", function (code, reason) {
		broadcast(connection.nickname+" left")
	})
})
server.listen(8081)

function broadcast(str) {
	server.connections.forEach(function (connection) {
		connection.sendText(str)
	})
}

// serve the static html files
var staticServer = http.createServer(function(req, res) {
  var done = finalhandler(req, res);
  serve(req, res, done);
});

staticServer.listen(8000);