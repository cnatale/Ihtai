var RedBlackTreeAdapter = (function() {
	/*
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

	function insert(tableId, nodeToAdd) {
		return new Promise (
			function(resolve, reject) {
				$R.insert( fsUidTrees[tableId], nodeToAdd );
				resolve(true);
		});
	}

	function insertSSActionId(fsUid, actionUid, nodeToAdd) {
		return new Promise (
			function(resolve, reject) {
				SSActionIdTables[fsUid][actionUid] = nodeToAdd;
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

	function delSSActionId(fsUid, actionUid) {
		return new Promise (
			function(resolve, reject) {
				delete SSActionIdTables[fsUid][actionUid];
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
				fsUidTrees[tableId] = $R.createTree('delta');
				resolve(true);
		});
	}

	function createSSActionIdTable(fsUid) {
		return new Promise (
			function(resolve, reject) {
				SSActionIdTables[fsUid] = {};
				resolve(true);
		});
	}

	function hasOutputBeenExperienced(fsUid, actionUid) {
		return new Promise (
			function(resolve, reject) {
				resolve (SSActionIdTables[fsUid].hasOwnProperty( actionUid ));
		});
	}

	function getStoredStimuli(fsUid, actionUid) {
		return new Promise (
			function(resolve, reject) {
				resolve( SSActionIdTables[fsUid][actionUid]);
		});
	}

	function setStoredStimuli(fsUid, actionUid, nodeToStore) {
		return new Promise (
			function(resolve, reject) {
				SSActionIdTables[fsUid][actionUid] = nodeToStore;
				resolve(true);
		});
	}

	function doesSSActionIdTableExist(fsUid) {
		return new Promise (
			function(resolve, reject) {
				if (typeof SSActionIdTables[fsUid] === 'undefined' ) {
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
