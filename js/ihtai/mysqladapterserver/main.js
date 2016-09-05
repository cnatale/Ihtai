/*var http = require("http")
var ws = require("nodejs-websocket")
var fs = require("fs")
var finalhandler = require('finalhandler');
var serveStatic = require('serve-static');
var serve = serveStatic("./");
var mysql = require('mysql');
*/
/*
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



/////// this is a much easier way to serve static content and spawn a websocket server ////////

staticServer.listen(8000);
*/
var express = require('express');
var WebSocketP = require('websocket-promise');
var app = express();

/*app.get('/', function (req, res){
	res.send('hello world');
});*/
app.listen(3001, function() {
	console.log('listening to port 3001');
});
app.use(express.static('client'));

console.log('test websocket promise!')



var Server = new WebSocketP({port: 8090});
Server.onConnection(function(Client){
  Client.on('Hello', function(Job){
    console.log(Job.Message) // "World"
    Job.Response = 'World'
  });
});
console.log('listening to port 8090');

/*
TODO: 
-instantiate mysql_socket_server.js
-move the WebSocketP server instantiation into mysqlsocketserver
-
*/

