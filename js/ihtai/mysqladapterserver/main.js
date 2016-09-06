var http = require("http");
var finalhandler = require('finalhandler');
var serveStatic = require('serve-static');
var serve = serveStatic("./");
var socketServer = require('./server/mysql_socket_server');

// serve the static html files
var staticServer = http.createServer(function(req, res) {
  var done = finalhandler(req, res);
  serve(req, res, done);
});
staticServer.listen(8000);


/*
TODO: 
-instantiate mysql_socket_server.js
-move the WebSocketP server instantiation into mysqlsocketserver
-
*/

