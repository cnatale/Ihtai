var WebsocketAdapter = (function() {
	/*
	Creates websocket connection to api server. This allows for myriad server side storage options,
	so long as they obey the protocol.

	To start with, mysqladapterserver will support this protocol

	Protocol will use api method names that are identical to adapter method names

	Things we need to store:

	fsUidTrees and SSActionIdTables allow for efficient storage and retrieval of memory sequence data

	fsUidTrees: searcheable collections of memory chains, keyed off first state uid.
		schema: each tree is keyed off dist from ideal drive state

		
	SSActionIdTables schema: each key is a memory uid that references:
		-a hash table where each key is a second state output stimuli id for a memory chain, which references
		 a uidTree node from the tree with the same memory uid as this table's key.

	*/

	FSUID_TABLES = 'fsUidTrees';
	SSActionId_TABLES = 'SSActionIdTables';
	var fsUidTrees = {}, SSActionIdTables = {}

	function init() {
		// initialize websocket connection
		var exampleSocket = new WebSocket("ws:localhost:3000/socketserver");

	}
	init();

	function insert(tableId, nodeToAdd) {
		$R.insert( fsUidTrees[tableId], nodeToAdd );
	}

	function insertSSActionId(fsUid, actionUid, nodeToAdd) {
		SSActionIdTables[fsUid][actionUid] = nodeToAdd;
	}

	function del(tableId, nodeToDelete) {
		$R.del( fsUidTrees[tableId], nodeToDelete );
		return true;
	}

	function delSSActionId(fsUid, actionUid) {
		delete SSActionIdTables[fsUid][actionUid];
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
		fsUidTrees[tableId] = $R.createTree('delta');
	}

	function createSSActionIdTable(fsUid) {
		SSActionIdTables[fsUid] = {};
	}

	function hasOutputBeenExperienced(fsUid, actionUid) {
		return SSActionIdTables[fsUid].hasOwnProperty(actionUid);
	}

	function getStoredStimuli(fsUid, actionUid) {
		return SSActionIdTables[fsUid][actionUid];
	}

	function setStoredStimuli(fsUid, actionUid, nodeToStore) {
		SSActionIdTables[fsUid][actionUid] = nodeToStore;
	}

	function doesSSActionIdTableExist(fsUid) {
		if (typeof SSActionIdTables[fsUid] === 'undefined' ) {
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
		SSActionId_TABLES: SSActionId_TABLES,
		insert: insert,
		del: del,
		createTable: createTable,
		min: min,
		max: max,
		update: update,
		hasOutputBeenExperienced: hasOutputBeenExperienced,
		getStoredStimuli: getStoredStimuli,
		setStoredStimuli: setStoredStimuli,
		createSSActionIdTable: createSSActionIdTable,
		insertSSActionId: insertSSActionId,
		delSSActionId: delSSActionId,
		getFSUIDTreeSize: getFSUIDTreeSize,
		isAnFSUIDTree: isAnFSUIDTree,
		doesSSActionIdTableExist: doesSSActionIdTableExist
	}
})();

$RA = RedBlackTreeAdapter;
