describe('ihtai utils', function(){
	
	describe('red-black self-balancing binary search tree', function(){
		var $R;
		beforeEach(function(){
			$R = RedBlackTree;
		})

		it('Should create an empty red-black tree', function(){
			var rbTree = $R.createTree();
			expect(rbTree.root).toBe($R.getNilNode());
		});
  
		it('Should insert nodes to the tree', function(){
			function getInOrderKeys(node, res){
				if(typeof res === 'undefined')
					res=[];

				if(node.key===null)
					return;

				getInOrderKeys(node.left, res);
				res.push(node.key);
				getInOrderKeys(node.right, res);

				return res;
			}			

			var tree = $R.createTree();
			$R.insert(tree, {key:10});
			$R.insert(tree, {key:5});
			$R.insert(tree, {key:3});
			$R.insert(tree, {key:20});

			var inOrderKeys = getInOrderKeys(tree.root);
			expect(inOrderKeys).toEqual([3,5,10,20]);
		});
		
		
		it('Should delete nodes from the tree', function(){
			var T = $R.createTree();
			$R.insert(T, {key:10});
			$R.insert(T, {key:5});
			$R.insert(T, {key:3});
			$R.insert(T, {key:20});	

			var oldRootKey = T.root.key; 
			$R.del(T, T.root);	
			var newRootKey = T.root.key;

			expect(oldRootKey).not.toEqual(newRootKey);
		});
		
		it('Should keep the path from the root to the farthest leaf no more than twice the length of the path from the root to the nearest leaf', function(){
			function countRtChildDepth(node, ht){
				if(typeof ht === 'undefined')
					ht=0;

				if(node.key === null)
					return ht;

				
				return countRtChildDepth(node.right,++ht);
			}

			function countLtChildDepth(node, ht){
				if(typeof ht === 'undefined')
					ht=0;

				if(node.key === null)
					return ht;

				
				return countLtChildDepth(node.left,++ht);
			}

			var tree = $R.createTree();
			$R.insert(tree, {key:1});
			$R.insert(tree, {key:2});
			$R.insert(tree, {key:3});
			$R.insert(tree, {key:4});
			$R.insert(tree, {key:5});
			$R.insert(tree, {key:6});
			$R.insert(tree, {key:7});
			$R.insert(tree, {key:8});
			
			//rt path would be height of 8 without balancing, left would be 1
			expect(countRtChildDepth(tree.root)).toBe(4);

			expect(countLtChildDepth(tree.root)).toBe(3);		
		});
		
		it('Should return the smallest value stored in the tree', function(){
			var tree = $R.createTree();
			$R.insert(tree, {key:10});
			$R.insert(tree, {key:5});
			$R.insert(tree, {key:3});
			$R.insert(tree, {key:20});


			expect($R.min(tree.root).key).toBe(3);
		});
		
		it('Should return the largest node value stored in the tree', function(){
			var tree = $R.createTree();
			$R.insert(tree, {key:10});
			$R.insert(tree, {key:5});
			$R.insert(tree, {key:3});
			$R.insert(tree, {key:20});
			$R.insert(tree, {key:7});

			expect($R.max(tree.root).key).toBe(20);
		});
		
	})
})