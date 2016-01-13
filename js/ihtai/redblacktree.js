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
	var nilNode={key:null, left:null, right:null, color:BLACK};

	function createTree(){
		return {
			root:nilNode
		}
	}

	function rotateLeft(T, x){
		var y = x.right;
		x.right = y.left;
		if(y.left !== nilNode)
			y.left.p = x;

		y.p = x.p;
		if(x.p === nilNode)
			T.root = y;
		else if(x===x.p.left) //if x is the parent's left node, make y the new left node of parent
			x.p.left = y;
		else x.p.right = y;	//if x is the parent's right node, make y the new right node of the parent
		y.left = x;
		x.p = y;
	}

	function rotateRight(T, y){
		var x = y.left;
		y.left=x.right;
		if(x.right !== nilNode)
			x.right.p = y;
		
		x.p=y.p;
		if(y.p === nilNode)
			T.root = x;
		else if(y === y.p.left) //if y is the parent's left node, make x the new left node of parent
			y.p.left = x;
		else y.p.right = x; //if y is the parent's right node, make x the new right node of the parent
		x.right = y;
		y.p = x;
	}

	function max(T){
		var node = T.root;

		while(node.right.key !== null){
			node = node.right;
		}

		return node.key;
	}
	function min(T){
		var node = T.root;

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
	function insert(T, z){
		var y = nilNode;
		var x = T.root;
		while (x !== nilNode){
			y=x;
			if(z.key < x.key)
				x = x.left;
			else
				x = x.right;
		}

		z.p = y;
		if (y === nilNode)
			T.root = z;
		else if (z.key < y.key)
			y.left = z;
		else
			y.right = z;

		z.left = nilNode;
		z.right = nilNode;
		z.color = RED;
		insertFixup(T, z);
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
				else{ 
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
				else{
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
	function rbTransplant(T, u, v) {
		if(u.p === nil)
			T.root = v;
		else if (u === u.p.left)
			u.p.left = v;
		else 
			u.p.right = v;
		v.p = u.p;
	}

	function rbDelete (T, z){
		var y = z;
		var yOriginalColor = y.color;
		if(z.left === T.nil){
			x = z.right;
			rbTransplant(T.z, z.right);
		}
		else if(z.right = T.nil) {
			x = z.left;
			rbTransplant(T.z, z.left);
		}
		else{
			y = treeMinimum(z.right);
			yOriginalColor = y.color;
			x = y.right;
			if(y.p === z)
				x.p = y;
			else {
				rbTransplant (T.y, y.right);
				y.right = z.right;
				y.right.p = y;
			}

			rbTransplant(T.x, y);
			y.left = z.left;
			y.left.p = y;
			y.color = z.color;
		}

		if(yOriginalColor === BLACK)
			rbDeleteFixup(T,x);
	}

	function rbDeleteFixup(T,x){
		while(x !== T.root && x.color === BLACK){
			if(x===x.p.left){
				w = x.p.right;
				if(w.color === RED) {
					w.color = BLACK;
					x.p.color = RED;
					rotateLeft(T, x.p);
					w = x.p.right;
				}
				if(w.left.color === BLACK && w.right.color === BLACK){
					w.color = RED;
					x = x.p;
				}
				else if (w.right.color === BLACK){
					w.left.color = BLACK;
					w.color = RED;
					rotateRight(T, w);
					w = x.p.right;
				}

				w.color = x.p.color;
				x.p.color = BLACK;
				w.right.color = BLACK;
				rotateLeft(T, x.p);
				x = T.root;
			}
			else{ //same as sibling if clause but with right and left exchanged

			}
		}
		x.color = BLACK;
	}

	function remove(id){
		return node;
	}

	return{
		createTree:createTree,
		getNilNode:function(){return nilNode},
		max:max,
		min:min,
		insert:insert,
		remove:remove,
		getRoot:getRoot
	}
})();