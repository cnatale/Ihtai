/*	Red-black self balancing binary search tree implementatin in JavaScript
	2015 Chris Natale. Implementation based on CLRS */
/*
	Red-black properties:
	1) every nde is either red or black
	2) the root is black
	3) every leaf (nilNode) is black
	4) if a node is red, then both its children are black
	5) for each node, all simple paths from the node to descendant leaves conain the same number of black nodes.
*/

var RedBlackTree  = (function RedBlackTree(){
	var BLACK=0, RED=1;

	function createTree(keyName){
		var nilNode;
		if(typeof keyName == 'undefined')
			keyName = 'key';

		nilNode={left:null, right:null, color:BLACK};
		nilNode[keyName]=null;

		return {
			nilNode:nilNode,
			keyName:keyName,
			root:nilNode,
			size:0
		}
	}

	function inOrder(T, x){
		if(x !== T.nilNode) {
			inOrder(T, x.left);
			console.log('=====NODE=====');
			console.log('id: ' + x.ss[2].id + T.size)
			console.log('sd: ' + x[T.keyName]);
			console.log('tdist: ' + x.tdist);
			console.log('left node: ' + (x.left !== T.nilNode ? x.left.ss[2].id : 'nil') + T.size);
			console.log('right node: ' + (x.right !== T.nilNode ? x.right.ss[2].id : 'nil') + T.size);
			console.log('==============');
			inOrder(T, x.right);
		}
	}

	function rotateLeft(T, x){
		var y = x.right;
		x.right = y.left;
		if(y.left !== T.nilNode) {
			y.left.p = x;
		}

		y.p = x.p;
		if(x.p === T.nilNode) {
			T.root = y;
		}
		else if(x===x.p.left) { //if x is the parent's left node, make y the new left node of parent
			x.p.left = y;
		}
		else {
			x.p.right = y;	//if x is the parent's right node, make y the new right node of the parent
		}

		y.left = x;
		x.p = y;
	}

	function rotateRight(T, x){
		var y = x.left;
		x.left=y.right;
		if(y.right !== T.nilNode) {
			y.right.p = x;
		}
		
		y.p=x.p;
		if(x.p === T.nilNode) {
			T.root = y;
		}
		else if(x === x.p.left) { //if x is the parent's left node, make y the new left node of parent
			x.p.left = y;
		}
		else {
			x.p.right = y; //if x is the parent's right node, make y the new right node of the parent
		}
		y.right = x;
		x.p = y;
	}

	function max(T, node){
		while(node.right[T.keyName] !== null){
			node = node.right;
		}

		return node;
	}
	function min(T, node){
		while(node.left[T.keyName] !== null){
			node = node.left;
		}

		return node;
	}

	function successor(T, x) {
		if(x.right !== T.nilNode) {
			return min(T, x.right);
		}
		var y = x.p;

		while (y !== T.nilNode && x === y.right) {
			x = y;
			y = y.p;
		}
		return y;
	}

	function predecessor(T, x) {
		if(x.left !== T.nilNode) {
			return max(T, x.left);
		}
		var y = x.p;

		while(y !== T.nilNode && x === y.left) {
			x = y;
			y = y.p;
		}
		return y;
	}

	function getRoot(){
		return root;
	}

	/**
	@function insert
	Inserts a node into tree
	@param z {node} A tree node that contains a key property
	*/

	function insert(T, z){
		var y = T.nilNode;
		var x = T.root;
		while (x !== T.nilNode){
			y=x;
			if(z[T.keyName] < x[T.keyName]) {
				x = x.left;
			}
			else {
				x = x.right;
			}
		}

		z.p = y;
		if (y === T.nilNode) {
			T.root = z;
		}
		else if (z[T.keyName] < y[T.keyName]) {
			y.left = z;
		}
		else {
			y.right = z;
		}

		z.left = T.nilNode;
		z.right = T.nilNode;
		z.color = RED;
		insertFixup(T, z);

		//increment size counter
		T.size++;
	}
	function insertFixup(T,z){
		while(z.p.color == RED){
			if(z.p == z.p.p.left){ //z.p is grandparrent's left child
				y = z.p.p.right;
				if(y.color == RED){
					z.p.color = BLACK;
					y.color = BLACK;
					z.p.p.color = RED;
					z= z.p.p;
				}
				else {
					if(z == z.p.right){
						z = z.p;
						rotateLeft(T, z);
					}
					z.p.color = BLACK;
					z.p.p.color = RED;
					rotateRight(T, z.p.p);
				}
			}
			else{ //z.p is grandparent's right child 
				//same as previous block but with 'right' and 'left' exchanged
				y = z.p.p.left;
				if(y.color == RED){
					z.p.color = BLACK;
					y.color = BLACK;
					z.p.p.color = RED;
					z= z.p.p;
				}
				else { 
					if(z == z.p.left){
						z = z.p;
						rotateRight(T, z);
					}
					z.p.color = BLACK;
					z.p.p.color = RED;
					rotateLeft(T, z.p.p);
				}
			}
		}
		T.root.color = BLACK;
	}

	/*** Delete methods ***/

	/**
	Replaces u's parent reference to u (either left or right) with v, and v's parent reference becomes u's parent
	*/
	function rbTransplant(T, u, v) {
		if(u.p === T.nilNode){
			T.root = v;
		}
		else if (u === u.p.left)
			u.p.left = v;
		else 
			u.p.right = v;

		v.p = u.p;
	}

	function del (T, z){
		if (typeof z === 'undefined') {
			debugger;
		}
		var x;
		var y = z;
		var yOriginalColor = y.color;
		if(z.left === T.nilNode){
			x = z.right;
			//x = successor(T, z);
			rbTransplant(T, z, z.right);
		}
		else if(z.right === T.nilNode) {
			x = z.left;
			//x = predecessor(T, z);
			rbTransplant(T, z, z.left);
		}
		else{
			y = min(T, z.right);
			//y = successor(T, z);
			yOriginalColor = y.color;
			x = y.right;
			if(y.p === z) {
				x.p = y;
			}
			else {
				rbTransplant (T, y, y.right);
				y.right = z.right;
				y.right.p = y;
			}

			rbTransplant(T, z, y);
			y.left = z.left;
			y.left.p = y;
			y.color = z.color;
		}

		if(yOriginalColor === BLACK)
			rbDeleteFixup(T,x);

		//decrement counter
		T.size--;
	}

	function rbDeleteFixup(T,x){
		var w;
		while(x !== T.root && x.color === BLACK){
			if(x===x.p.left){ // x is left child of parent
				w = x.p.right;
				if(w.color === RED) {
					w.color = BLACK;
					x.p.color = RED;
					rotateLeft(T, x.p);
					w = x.p.right;
				}
				if(w.right === null || w.left === null) {
					debugger;
					//this crashes app
				}
				if(w.left.color === BLACK && w.right.color === BLACK){
					w.color = RED;
					x = x.p;
				}
				else {
					if (w.right.color === BLACK){
						w.left.color = BLACK;
						w.color = RED;
						rotateRight(T, w);
						w = x.p.right;
					}
					w.color = x.p.color;
					x.p.color = BLACK;
					w.right.color = BLACK;
					rotateLeft(T, x.p);
					x = T.root; /* this exits while loop */
				}
			}
			else{ //same as sibling if clause but with right and left exchanged; x is rt child of parent
				w = x.p.left;
				if(w.color === RED) {
					w.color = BLACK;
					x.p.color = RED;
					rotateRight(T, x.p);
					w = x.p.left;
				}
				if(w.right === null || w.left === null) {
					debugger;
					//this crashes app
				}
				if(w.right.color === BLACK && w.left.color === BLACK){
					w.color = RED;
					x = x.p;
				}
				else {
					if (w.left.color === BLACK){
						w.right.color = BLACK;
						w.color = RED;
						rotateLeft(T, w);
						w = x.p.left;
					}
					w.color = x.p.color;
					x.p.color = BLACK;
					w.left.color = BLACK;
					rotateRight(T, x.p);
					x = T.root; /* exit point for loop */
				}
			}
		}
		x.color = BLACK;
	}

	function hasKey (T, z) {
		var y = T.nilNode;
		var x = T.root;
		while (x !== T.nilNode){
			if (z === x[T.keyName])
				return x;

			y=x;
			if(z < x[T.keyName])
				x = x.left;
			else
				x = x.right;
		}
		return false;
	}

	return{
		createTree:createTree,
		getNilNode:function( T ){ return T.nilNode },
		max:max,
		min:min,
		insert:insert,
		del:del,
		getRoot:getRoot,
		hasKey:hasKey,
		rotateLeft:rotateLeft,
		rotateRight:rotateRight,
		getSize: function ( T ) { return T.size; },
		inOrder: inOrder
	}
})();

$R = RedBlackTree;