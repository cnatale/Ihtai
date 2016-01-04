describe('ihtai utils', function(){
	
	describe('red-black self-balancing binary search tree', function(){
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

			var tree = new RedBlackTree();
			tree.insert({key:10});
			tree.insert({key:5});
			tree.insert({key:3});
			tree.insert({key:20});

			var inOrderKeys = getInOrderKeys(tree.getRoot());
			expect(inOrderKeys).toEqual([3,5,10,20]);
		});
		/*
		it('Should delete nodes from the tree', function(){
			expect(false).toBe(true);
		});

		it('Should keep the path from the root to the farthest leaf no more than twice the length of the path from the root to the nearest leaf', function(){
			expect(false).toBe(true);
		});
	*/
		it('Should return the smallest value stored in the tree', function(){
			var tree = new RedBlackTree();
			tree.insert({key:10});
			tree.insert({key:5});
			tree.insert({key:3});
			tree.insert({key:20});


			expect(tree.min()).toBe(3);
		});
		it('Should return the largest node value stored in the tree', function(){
			var tree = new RedBlackTree();
			tree.insert({key:10});
			tree.insert({key:5});
			tree.insert({key:3});
			tree.insert({key:20});
			tree.insert({key:7});

			expect(tree.max()).toBe(20);
		});
	})
})