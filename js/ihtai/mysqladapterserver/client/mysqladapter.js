var MysqlAdapter = (function() {
	/*
	The client side db request protocol methods.

	This client is 'dumb'. All it does is create a socket connection to server,
	ferry requests to server using said socket connection, and return promises
	that resolve to the socket method's response.
	*/

	FSUID_TABLES = 'fsUidTrees';
	SSID_TABLES = 'ssIdTables';
	var fsUidTrees = {}, ssIdTables = {};
	var connection;

	function init() {
		// initialize websocket connection
		connection = new WebSocket("ws://"+window.location.hostname+":8081");
		connection.onopen = function () {
			console.log("Connection opened")
		}
		connection.onclose = function () {
			console.log("Connection closed")
		}
		connection.onerror = function () {
			console.error("Connection error")
		}
		connection.onmessage = function (event) {
			/*var div = document.createElement("div")
			div.textContent = event.data
			document.body.appendChild(div)
			*/
		}
	}
	init();

	function insert(tableId, nodeToAdd) {
		$R.insert( fsUidTrees[tableId], nodeToAdd );
	}

	function insertSSID(fsUid, ssUid, nodeToAdd) {
		ssIdTables[fsUid][ssUid] = nodeToAdd;
	}

	function del(tableId, nodeToDelete) {
		$R.del( fsUidTrees[tableId], nodeToDelete );
		return true;
	}

	function delSSID(fsUid, ssUid) {
		delete ssIdTables[fsUid][ssUid];
	}

	function update(tableId, nodeToUpdate) {
		$R.del( fsUidTrees[tableId], nodeToUpdate );
		return $R.insert( fsUidTrees[tableId], nodeToUpdate );
	}

	function min(tableId) {
		return $R.min( fsUidTrees[tableId], fsUidTrees[tableId].root );
	}

	function max(tableId) {
		return $R.max( fsUidTrees[tableId], fsUidTrees[tableId].root );
	}

	function createTable(tableId) {
		// TODO: send request to server
		connection.send( JSON.stringify({ opName:'createTable', params:tableId }) );
	}

	function createSSIDTable(fsUid) {
		// TODO: send request to server
		connection.send( JSON.stringify({ opName: 'createSSIDTable', params:fsUid }) );
	}

	function hasOutputBeenExperienced(fsUid, ssUid) {
		return ssIdTables[fsUid].hasOwnProperty(ssUid);
	}

	function getStoredStimuli(fsUid, ssUid) {
		return ssIdTables[fsUid][ssUid];
	}

	function setStoredStimuli(fsUid, ssUid, nodeToStore) {
		ssIdTables[fsUid][ssUid] = nodeToStore;
	}

	function doesSSIDTableExist(fsUid) {
		if (typeof ssIdTables[fsUid] === 'undefined' ) {
			return false;
		}
		else {
			return true;
		}
	}

	function getFSUIDTreeSize(fsUid) {
		return fsUidTrees[fsUid].size;
	}

	function isAnFSUIDTree(fsUid) {
		return fsUidTrees.hasOwnProperty(fsUid);
	}

	return {
		FSUID_TABLES: FSUID_TABLES,
		SSID_TABLES: SSID_TABLES,
		insert: insert,
		del: del,
		createTable: createTable,
		min: min,
		max: max,
		update: update,
		hasOutputBeenExperienced: hasOutputBeenExperienced,
		getStoredStimuli: getStoredStimuli,
		setStoredStimuli: setStoredStimuli,
		createSSIDTable: createSSIDTable,
		insertSSID: insertSSID,
		delSSID: delSSID,
		getFSUIDTreeSize: getFSUIDTreeSize,
		isAnFSUIDTree: isAnFSUIDTree,
		doesSSIDTableExist: doesSSIDTableExist
	}
})();

$RA = RedBlackTreeAdapter;
