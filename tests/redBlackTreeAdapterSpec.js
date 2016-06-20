describe('ihtai utils', function(){
	describe('red-black self-balancing binary search tree', function(){
		beforeEach(function(){
		})

		it('Should create an empty red-black tree', function(){
			var rbTree = $R.createTree();
			expect(rbTree.root).toBe($R.getNilNode(rbTree));
		});


	});
});