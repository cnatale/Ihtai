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
		var memorizer, memory, cluster;
		beforeEach(function(){
			memorizer = new Memorizer(100);

			memory=[10,20,30,40,50];
			cluster = {id:0, stimuli:memory};
			memorizer.memorize(cluster);
			var memory2=[50,40,30,20,10];
			var cluster2 = {id:1, stimuli:memory2};
			memorizer.memorize(cluster2);
			var memory3=[0,0,0,0,0];
			var cluster3 = {id:2, stimuli:memory3};
			memorizer.memorize(cluster3);

			var memory4=[30,30,30,30,30];
			var cluster4 = {id:3, stimuli:memory4};
			memorizer.memorize(cluster4);
			var memory5=[35,35,35,35,35];
			var cluster5 = {id:4, stimuli:memory5};
			memorizer.memorize(cluster5);
			var memory6=[40,40,40,40,40];
			var cluster6 = {id:5, stimuli:memory6};
			memorizer.memorize(cluster6);			
		});
		afterEach(function(){

		});

		it('should initialize memorizer', function(){
			expect(memorizer.getHeight()).toBe(100);
		});

		it('should memorize vectors', function(){


			var levels = memorizer.getLevels();
			expect(levels[0].series["3"].startState).toEqual([30,30,30,30,30]);
			expect(levels[0].series["3"].secondState).toEqual([35,35,35,35,35]);
			expect(levels[0].series["3"].endState).toEqual([40,40,40,40,40]);
		});		

		it('given a cluster, should return vector representing next action agent should take to minimize homeostasis differential', function(){
			var res=memorizer.query(cluster);
			/*
			Explanation: the final memory in the series starting with cluster reaches perfect homeostasis
			([0,0,0,0,0]). We expect res to equal the second vector in the series, [50,40,30,20,10]. This 
			is the 'next step' that IHTAI thinks agent should take to get as close as possible to homeostasis
			goal from current input stimuli.
			*/
			expect(res).toEqual([50,40,30,20,10]);
		})

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