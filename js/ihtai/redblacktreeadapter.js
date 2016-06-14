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

	// in this case, storeName is either fsUidTrees or ssIdTrees, and tableId is the fsUid/ssId property of the storeName

	function insert(storeName, tableId, nodeToAdd) {
		$R.insert( storeName[tableId], nodeToAdd );
	}

	function del(storeName, tableId, nodeToDelete) {
		return $R.del( storeName[tableId], nodeToDelete );
	}

	function update(storeName, tableId, nodeToUpdate) {
		$R.del( storeName[tableId], nodeToUpdate );
		return $R.insert( storeName[tableId], nodeToUpdate );
	}

	function min(storeName, tableId) {
		return $R.min( storeName[tableId], storeName[tableId].root );
	}

	function max(storeName, tableId) {
		return $R.max( storeName[tableId], storeName[tableId].root );
	}

	function createTable(storeName, tableId) {
		storeName[tableId] = $R.createTree('sd');		
	}

	function delTable(storeName, tableId) {

	}

	return {
		FSUID_TABLES: FSUID_TABLES,
		SSID_TABLES: SSID_TABLES,
		insert: insert,
		del: del,
		createTable: createTable,
		delTable: delTable,
		min: min,
		max: max
	}
})();

$RA = RedBlackTreeAdapter;