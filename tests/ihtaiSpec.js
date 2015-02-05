describe('ihtai', function(){

	beforeEach(function(){

	});

	afterEach(function(){

	});

	describe('Clusters', function(){
		var clusters;
		beforeEach(function(){
			clusters = new Clusters(1000, 5);
		});
		afterEach(function(){

		});

		it('should initialize clusters', function(){
			var c= clusters.getClusters();
			expect(c.length).toBe(1000);
			expect(c[0].stimuli).toEqual([50,50,50,50,50]);
		});

		it('should find nearest cluster for a vector', function(){
			var res=clusters.findNearestCluster([50,50,50,50,50]);
			expect(res.id).toBe(0); //cluster 0 is specifically given this value during initialization
		});
	});

	describe('Memorizer', function(){
		beforeEach(function(){

		});
		afterEach(function(){

		});


	});

	describe('ihtai core', function(){
		beforeEach(function(){

		});
		afterEach(function(){

		});

		it('should initialize', function(){
			var ihtai = new Ihtai();
			
		});	
	})

});