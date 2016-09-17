/**
	The server side db request protocol methods.
*/
var mysql = require('mysql');
var WebSocketP = require('websocket-promise');

console.log('loading mysql_socket_server module');

// connect to mysql db, default port is 3306
mysqlConnection = mysql.createConnection({
	multipleStatements: true,
	user     : 'root',
	password : 'bianco',
	database : 'ihtai'
});

// create socket server instance
var Server = new WebSocketP({port: 8090});
Server.onConnection(function(Client){
	// instantiation logic goes here
	console.log('listening to port 8090');

	Client.on('insert', function(Job){
   		console.log(Job.Message)
   		protocolMethods.insert(Job, Job.Message[0], Job.Message[1]);
	});

	Client.on('createTable', function(Job){
		console.log(Job.Message)
		protocolMethods.createTable(Job.Message[0]);
	});
});



// TODO: write db queries that reproduce the behavior of redblacktreeadapter, then send data back to client.
// mysqladapter is dumb in that it just ferries requests and receives responses 

/*  from Ihtai.js comments:
	fsUidTrees and SSActionIdTables allow for efficient storage and retrieval of memory sequence data

	fsUidTrees: searcheable collections of memory chains, keyed off first state uid.
		schema: each tree is keyed off dist from ideal drive state
		
		ex: fsUidTrees[tableId] = $R.createTree('delta'); //create an fsUid tree
			$R.insert( fsUidTrees[tableId], nodeToAdd ); //insert a memory into an fsUidTree
		
	SSActionIdTables schema: each key is a memory uid that references:
		-a hash table where each key is a second state output stimuli id for a memory chain, which references
		 a uidTree node from the tree with the same memory uid as this table's key.
		
		ex: SSActionIdTables[fsUid] = {} //create a SSActionId lookup table
			 SSActionIdTables[fsUid][actionUid] = nodeToStore; //store something in SSActionId lookup table

		-note that fsUidTrees sub-objects store red-black trees, while SSActionIdTables sub-objects store
		 nodes directly. This difference may not longer be applicable since we're storing everything
		 in sql tables (essentially b-trees)
*/

var protocolMethods = {
	insert: function(Job) {
		var tableId = Job.Message[0];
		var delta = Job.Message[1];
		var tdist = Job.Message[2];
		var nodeToAdd = Job.Message[3];

		//added a node to redblacktree
		var queryString = "INSERT INTO " + tableId + " VALUES ('"+ tableId +"', "+ delta +", "+ tdist +", '"+ nodeToAdd +"');";
		mysqlConnection.query(queryString, function(err, rows, fields) {
		//mysqlConnection.query("INSERT INTO t1_3_4 VALUES (2, 4, 30, 'another node');", function(err, rows, fields) {
			if (err) throw err; 
			return true;
		});
	},
	insertSSActionId: function(fsUid, actionUid, nodeToAdd) {
		//inserted an element into SSActionId table in redblacktree
		//can be turned into no-op, and all functionality handled by insert
		return true;
	},
	del: function(tableId, nodeToDelete) {
		//deleted node from redblacktree

	},
	delSSActionId: function(fsUid, actionUid) {
		//deleted memory reference from SSActionId table
		//can be turned into no-op, and all functionality handled by del
		return true;
	},
	update: function(tableId, nodeToUpdate) {
		//used to rebalance redblacktree.
		//called delete then add in order in redblacktree. 

		//make this the only update method
	},
	min: function(tableId) {
		//should rename tableId to fsuid since that's what it's being called everywhere else in this module

	},
	max: function(tableId) {

	},

	// TODO: look into using native mysql JSON object for jsondata
	createTable: function(tableId) {
		//note: callback function throws an error if table already exists

		//created redblacktree and referenced through fsuid table
		mysqlConnection.query('CREATE TABLE ' + tableId + '(uid varchar(255), delta double, tdist integer, jsondata text);', function(err, rows, fields) {
			if (err) throw err; 
			return true;
		});
	},
	createSSActionIdTable: function(fsUid) {
		//created SSActionId table
		//can be turned into no-op, and all funcitonality handled by createTable
		return true;
	},
	hasOutputBeenExperienced: function(fsUid, actionUid) {
		//query fsuid table for row with actionUid
	},
	getStoredStimuli: function(fsUid, actionUid) {
		// get the entire stored stm json object (fs, ss, es, etc.)

	},
	setStoredStimuli: function(fsUid, actionUid, nodeToStore) {
		// change value of entire stored stm json object based on SSActionId value
		// should call through to update
		this.update(fsUid, nodeToStore);
	},
	doesSSActionIdTableExist: function(fsUid) {
		// name could probably be refactored since this is looking up the same table as fsuid, unlike the
		// redblacktree implementation
	},
	getFSUIDTreeSize: function(fsUid) {
		//returned number of elements in redblacktree; can do same thing with number of rows for an fsuid table
	},
	isAnFSUIDTree: function(fsUid) {
		// returned boolean representing if fsUid key existed in fsUid tree table
		// this should be the same functionality as doesSSActionIdTableExist
	}
};

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
