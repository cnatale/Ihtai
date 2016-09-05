/**
	The server side db request protocol methods.
*/

var http = require("http")
var ws = require("nodejs-websocket")
var fs = require("fs")
var finalhandler = require('finalhandler');
var serveStatic = require('serve-static');
var serve = serveStatic("./");
var mysql = require('mysql');
var WebSocketP = require('websocket-promise');

// connect to mysql db
mysqlConnection: mysql.createConnection({
	multipleStatements: true,
	user     : 'root',
	password : 'bianco',
	database : 'ihtai'
});

// create socket server instance
var Server = new WebSocketP({port: 8090});
Server.onConnection(function(Client){
	// instantiation logic goes here



	Client.on('Hello', function(Job){
   		console.log(Job.Message) // "World"
    	Job.Response = 'World'
	});
});
console.log('listening to port 8090');


// TODO: write db queries that reproduce the behavior of redblacktreeadapter, then send data back to client.
// mysqladapter is dumb in that it just ferries requests and receives responses 
var protocolMethods = {
	insert: function(tableId, nodeToAdd) {
		//TODO: convert 
		// $R.insert( fsUidTrees[tableId], nodeToAdd );
		/* mysqlConnection.query('CREATE TABLE ' + str + '(PersonID int);', function(err, rows, fields) {
			if (err) throw err;
			// console.log('The solution is: ', rows[0].solution);
		}); */
	},
	insertSSID: function(fsUid, ssUid, nodeToAdd) {

	},
	del: function(tableId, nodeToDelete) {

	},
	delSSID: function(fsUid, ssUid) {

	},
	update: function(tableId, nodeToUpdate) {

	},
	min: function(tableId) {

	},
	max: function(tableId) {

	},
	/*  from Ihtai.js comments:
		fsUidTrees and ssIdTables allow for efficient storage and retrieval of memory sequence data

		fsUidTrees: searcheable collections of memory chains, keyed off first state uid.
			schema: each tree is keyed off dist from ideal drive state
			
			ex: fsUidTrees[tableId] = $R.createTree('sd'); //create an fsUid tree
				$R.insert( fsUidTrees[tableId], nodeToAdd ); //insert a memory into an fsUidTree
			
		ssIdTables schema: each key is a memory uid that references:
			-a hash table where each key is a second state output stimuli id for a memory chain, which references
			 a uidTree node from the tree with the same memory uid as this table's key.
			
			ex: ssIdTables[fsUid] = {} //create a ssid lookup table
				 ssIdTables[fsUid][ssUid] = nodeToStore; //store something in ssid lookup table

			-note that fsUidTrees sub-objects store red-black trees, while ssIdTables sub-objects store
			 nodes directly. This difference may not longer be applicable since we're storing everything
			 in sql tables (essentially b-trees)
	*/

	createTable: function(tableId) {
		mysqlConnection.query('CREATE TABLE ' + tableId + '(uid varchar, sd double, tdist integer, jsondata text);', function(err, rows, fields) {
			if (err) throw err;
			// console.log('The solution is: ', rows[0].solution);
		});
	},
	createSSIDTable: function(fsUid) {
		mysqlConnection.query('CREATE TABLE ' + fsUid + '(uid varchar, sd double, tdist integer, jsondata text);', function(err, rows, fields) {
			if (err) throw err;
			// console.log('The solution is: ', rows[0].solution);
		});
	},
	hasOutputBeenExperienced: function(fsUid, ssUid) {

	},
	getStoredStimuli: function(fsUid, ssUid) {

	},
	setStoredStimuli: function(fsUid, ssUid, nodeToStore)

	},
	doesSSIDTableExist: function(fsUid) {

	},
	getFSUIDTreeSize: function(fsUid) {

	},
	isAnFSUIDTree: function(fsUid) {

	}
}

module.exports = protocolMethods;



	// this may not be necessary with the new socket promise api
	/*
		protocol format:
		{
			opName: String,
			params: []
		}
	*/

	/* stringToOp: function(str) {
		var jsonObj = JSON.parse(str);
		if (protocolMethods.hasOwnProperty(jsonObj.opName)) {
			protocolMethods[str.opName].apply(this, jsonObj.params);
		}
		else {
			throw 'Error: no op by this name';
		}
	},*/

	/* var server = ws.createServer(function (connection) {
		connection.on("text", function (str) {
			stringToOp(str);


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
	*/
