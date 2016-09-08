var RedBlackTreeAdapter = (function() {
	/*
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

	function insert(tableId, nodeToAdd) {
		return new Promise (
			function(resolve, reject) {
				$R.insert( fsUidTrees[tableId], nodeToAdd );
				resolve(true);
		});
	}

	function insertSSID(fsUid, actionUid, nodeToAdd) {
		return new Promise (
			function(resolve, reject) {
				ssIdTables[fsUid][actionUid] = nodeToAdd;
				resolve(true);
		});
	}

	function del(tableId, nodeToDelete) {
		return new Promise (
			function(resolve, reject) {
				$R.del( fsUidTrees[tableId], nodeToDelete );
				resolve(true);
		});
	}

	function delSSID(fsUid, actionUid) {
		return new Promise (
			function(resolve, reject) {
				delete ssIdTables[fsUid][actionUid];
				resolve(true);
		});
	}

	function update(tableId, nodeToUpdate) {
		return new Promise (
			function(resolve, reject) {
				$R.del( fsUidTrees[tableId], nodeToUpdate );
				$R.insert( fsUidTrees[tableId], nodeToUpdate );
				resolve(true);
		});
	}

	function min(tableId) {
		return new Promise (
			function(resolve, reject) {
				resolve( $R.min( fsUidTrees[tableId], fsUidTrees[tableId].root ));
		});
	}

	function max(tableId) {
		return new Promise (
			function(resolve, reject) {
				resolve( $R.max( fsUidTrees[tableId], fsUidTrees[tableId].root ));
		});
	}

	function createTable(tableId) {
		return new Promise (
			function(resolve, reject) {
				fsUidTrees[tableId] = $R.createTree('sd');
				resolve(true);
		});
	}

	function createSSIDTable(fsUid) {
		return new Promise (
			function(resolve, reject) {
				ssIdTables[fsUid] = {};
				resolve(true);
		});
	}

	function hasOutputBeenExperienced(fsUid, actionUid) {
		return new Promise (
			function(resolve, reject) {
				resolve (ssIdTables[fsUid].hasOwnProperty( actionUid ));
		});
	}

	function getStoredStimuli(fsUid, actionUid) {
		return new Promise (
			function(resolve, reject) {
				resolve( ssIdTables[fsUid][actionUid]);
		});
	}

	function setStoredStimuli(fsUid, actionUid, nodeToStore) {
		return new Promise (
			function(resolve, reject) {
				ssIdTables[fsUid][actionUid] = nodeToStore;
				resolve(true);
		});
	}

	function doesSSIDTableExist(fsUid) {
		return new Promise (
			function(resolve, reject) {
				if (typeof ssIdTables[fsUid] === 'undefined' ) {
					resolve (false);
				}
				else {
					resolve (true);
				}
		});
	}

	function getFSUIDTreeSize(fsUid) {
		return new Promise (
			function(resolve, reject) {
				resolve( fsUidTrees[fsUid].size);
		});
	}

	function isAnFSUIDTree(fsUid) {
		return new Promise (
			function(resolve, reject) {
				resolve( fsUidTrees.hasOwnProperty(fsUid));
		});
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
