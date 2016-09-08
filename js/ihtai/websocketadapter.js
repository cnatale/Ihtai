var WebsocketAdapter = (function() {
	/*
	Creates websocket connection to api server. This allows for myriad server side storage options,
	so long as they obey the protocol.

	To start with, mysqladapterserver will support this protocol

	Protocol will use api method names that are identical to adapter method names

	Things we need to store:

	fsUidTrees and ssIdTables allow for efficient storage and retrieval of memory sequence data

	fsUidTrees: searcheable collections of memory chains, keyed off first state uid.
		schema: each tree is keyed off dist from ideal drive state

		
	ssIdTables schema: each key is a memory uid that references:
		-a hash table where each key is a second state output stimuli id for a memory chain, which references
		 a uidTree node from the tree with the same memory uid as this table's key.

	*/

	FSUID_TABLES = 'fsUidTrees';
	SSID_TABLES = 'ssIdTables';
	var fsUidTrees = {}, ssIdTables = {}

	function init() {
		// initialize websocket connection
		var exampleSocket = new WebSocket("ws:localhost:3000/socketserver");

	}
	init();

	function insert(tableId, nodeToAdd) {
		$R.insert( fsUidTrees[tableId], nodeToAdd );
	}

	function insertSSID(fsUid, actionUid, nodeToAdd) {
		ssIdTables[fsUid][actionUid] = nodeToAdd;
	}

	function del(tableId, nodeToDelete) {
		$R.del( fsUidTrees[tableId], nodeToDelete );
		return true;
	}

	function delSSID(fsUid, actionUid) {
		delete ssIdTables[fsUid][actionUid];
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
		fsUidTrees[tableId] = $R.createTree('sd');
	}

	function createSSIDTable(fsUid) {
		ssIdTables[fsUid] = {};
	}

	function hasOutputBeenExperienced(fsUid, actionUid) {
		return ssIdTables[fsUid].hasOwnProperty(actionUid);
	}

	function getStoredStimuli(fsUid, actionUid) {
		return ssIdTables[fsUid][actionUid];
	}

	function setStoredStimuli(fsUid, actionUid, nodeToStore) {
		ssIdTables[fsUid][actionUid] = nodeToStore;
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
