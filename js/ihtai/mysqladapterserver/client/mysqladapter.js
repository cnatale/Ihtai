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
	var Connection;

	function init() {
		Connection = new WebSocketP("ws://localhost:8090");
		console.log('initializing mysqladapter');
	}
	init();

	function insert(tableId, nodeToAdd) {
		return MysqlAdapter.Connection.request("insert", [tableId, nodeToAdd]);
	}

	function insertSSID(fsUid, actionUid, nodeToAdd) {
		return MysqlAdapter.Connection.request("insertSSID", [fsUid, actionUid, nodeToAdd]);
	}

	function del(tableId, nodeToDelete) {
		return MysqlAdapter.Connection.request("del", [tableId, nodeToDelete]);
	}

	function delSSID(fsUid, actionUid) {
		return MysqlAdapter.Connection.request("delSSID", [fsUid, actionUid]);
	}

	function update(tableId, nodeToUpdate) {
		return MysqlAdapter.Connection.request("update", [tableId, nodeToUpdate]);
	}

	function min(tableId) {
		return MysqlAdapter.Connection.request("min", [tableId]);
	}

	function max(tableId) {
		return MysqlAdapter.Connection.request("max", [tableId]);
	}

	function createTable(tableId) {
		return MysqlAdapter.Connection.request("createTable", [tableId]);
	}

	function createSSIDTable(fsUid) {
		return MysqlAdapter.Connection.request("createSSIDTable", [fsUid]);
	}

	function hasOutputBeenExperienced(fsUid, actionUid) {
		return MysqlAdapter.Connection.request("hasOutputBeenExperienced", [fsUid, actionUid]);
	}

	function getStoredStimuli(fsUid, actionUid) {
		return MysqlAdapter.Connection.request("getStoredStimuli", [fsUid, actionUid]);
	}

	function setStoredStimuli(fsUid, actionUid, nodeToStore) {
		return MysqlAdapter.Connection.request("setStoredStimuli", [fsUid, actionUid, nodeToStore]);
	}

	function doesSSIDTableExist(fsUid) {
		return MysqlAdapter.Connection.request("doesSSIDTableExist", [fsUid]);
	}

	function getFSUIDTreeSize(fsUid) {
		return MysqlAdapter.Connection.request("getFSUIDTreeSize", [fsUid]);
	}

	function isAnFSUIDTree(fsUid) {
		return MysqlAdapter.Connection.request("isAnFSUIDTree", [fsUid]);
	}

	return {
		Connection: Connection,
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

var $MA = MysqlAdapter;
