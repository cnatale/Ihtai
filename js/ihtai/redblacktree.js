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

function RedBlackTree(){
	var BLACK=0, RED=1;
	var nilNode={key:null, left:null, right:null, color:BLACK};
	var root=nilNode;

	function rotateLeft(x){
		var y = x.right;
		x.right = y.left;
		if(y.left !== nilNode)
			y.left.p = x;

		y.p = x.p;
		if(x.p === nilNode)
			root = y;
		else if(x===x.p.left) //if x is the parent's left node, make y the new left node of parent
			x.p.left = y;
		else x.p.right = y;	//if x is the parent's right node, make y the new right node of the parent
		y.left = x;
		x.p = y;
	}

	function rotateRight(y){
		var x = y.left;
		y.left=x.right;
		if(x.right !== nilNode)
			x.right.p = y;
		
		x.p=y.p;
		if(y.p === nilNode)
			root = x;
		else if(y === y.p.left) //if y is the parent's left node, make x the new left node of parent
			y.p.left = x;
		else y.p.right = x; //if y is the parent's right node, make x the new right node of the parent
		x.right = y;
		y.p = x;
	}

	function max(){
		var node = root;

		while(node.right.key !== null){
			node = node.right;
		}

		return node.key;
	}
	function min(){
		var node = root;

		while(node.left.key !== null){
			node = node.left;
		}

		return node.key;
	}
	function getRoot(){
		return root;
	}

	/**
	@function insert
	Inserts a node into tree
	@param z {node} A tree node that contains a key property
	*/
	function insert(z){
		var y = nilNode;
		var x = root;
		while (x !== nilNode){
			y=x;
			if(z.key < x.key)
				x = x.left;
			else
				x = x.right;
		}

		z.p = y;
		if (y === nilNode)
			root = z;
		else if (z.key < y.key)
			y.left = z;
		else
			y.right = z;

		z.left = nilNode;
		z.right = nilNode;
		z.color = RED;
		insertFixup(z);
	}
	function insertFixup(z){
		while(z.p.color == RED){
			if(z.p == z.p.p.left){ //z.p is grandparrent's left child
				y = z.p.p.right;
				if(y.color == RED){
					z.p.color = BLACK;
					y.color = BLACK;
					z.p.p.color = RED;
					z= z.p.p;
				}
				else{ 
					if(z == z.p.right){
						z = z.p;
						rotateLeft(z);
					}
					z.p.color = BLACK;
					z.p.p.color = RED;
					rotateRight(z.p.p);
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
				else{
					if(z == z.p.left){
						z = z.p;
						rotateRight(z);
					}
					z.p.color = BLACK;
					z.p.p.color = RED;
					rotateLeft(z.p.p);
				}
			}
		}
		root.color = BLACK;
	}

	function remove(id){
		return node;
	}

	return{
		max:max,
		min:min,
		insert:insert,
		remove:remove,
		getRoot:getRoot
	}
};