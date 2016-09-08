var http = require("http");
var finalhandler = require('finalhandler');
var serveStatic = require('serve-static');
var serve = serveStatic("./");

//socket server is auto-instantiated
var socketServer = require('./server/mysql_socket_server');

// serve the static html files
var staticServer = http.createServer(function(req, res) {
  var done = finalhandler(req, res);
  serve(req, res, done);
});
staticServer.listen(8000);
