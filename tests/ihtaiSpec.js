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
			//TODO: always returns cluster 333 regardless of input. figure out why.
			clusters= new Clusters(1000, 5);
			var startDate=new Date();
			var res=clusters.findNearestCluster([50,50,50,50,50]);
			var endDate=new Date();
		
			var timeDiff=endDate.getTime()-startDate.getTime();
			console.log('findNearestCluster time: '+timeDiff);
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

	describe('Reflexes', function(){
		var reflexes;
		beforeEach(function(){
			var input=[];
			reflexes = new Reflexes([{
				matcher: function(stimuli){
					if(stimuli[3]===40)
						return true;
					else
						return false;
				}, 
				response: function(stimuli){
					return {
						indices:[4],
						signal:[10]
					}
				}
			}]);

		});
		afterEach(function(){

		});

		it('should trigger reflexes', function(){
			var memory=[10,20,30,40,50];
			var cluster = {id:0, stimuli:memory};
			var res=reflexes.cycle(cluster);

			expect(res.length).toBe(1);
			expect(res[0].indices).toEqual([4]);
			expect(res[0].signal).toEqual([10]);
		});


	});

	describe('Drives', function(){
		var drives, cluster;
		beforeEach(function(){
			//creates a simple drive object
			var drive={
				v:5,
				init:function(){
					this.v=5;
					return this.v;
				},
				cycle:function(stimuli){
					if(stimuli[0] > 50)
						this.v=0;
					else
						this.v++;
					return this.v;
				},
				targetValue:0
			};
			drives= new Drives([drive]);


		});
		afterEach(function(){

		});
		it('should allow access to drive goals', function(){
			expect(drives.getGoals()).toEqual([0]);
		});

		it('should initialize a drive', function(){
			var d=drives.getDrives();
			expect(d[0].v).toBe(5);
		});

		it('should cycle drive state', function(){
			var ioStim=[60,20,30,40,50], d;
			drives.cycle(ioStim);
			d=drives.getDrives();
			expect(d[0].v).toBe(0);

			ioStim=[10,20,30,40,50];
			drives.cycle(ioStim);
			expect(d[0].v).toBe(1);
		});
	});

	describe('ihtai core', function(){
		var ihtai, drives, reflexList;
		beforeEach(function(){
			var drive={
				v:5,
				init:function(){
					this.v=5;
					return this.v;
				},
				cycle:function(stimuli){
					if(stimuli[0] > 50)
						this.v=0;
					else
						this.v++;
					return this.v;
				},
				targetValue:0
			};
			drives=[drive];

			var reflexes = [{
				matcher: function(stimuli){
					if(stimuli[3]===40)
						return true;
					else
						return false;
				}, 
				response: function(stimuli){
					return {
						indices:[4],
						signal:[10]
					}
				}
			}];

			//initiliaze an ihtai with 9 dimensional i/o signal and 1d drive signal
			ihtai = new Ihtai({
				clusterCount:1000,
				vectorDim:10,
				memoryHeight:100,
				drivesList:drives,
				reflexList:reflexes,
				acceptableRange:80
			});
		});
		afterEach(function(){

		});

		it('should cycle when presented with io stimuli', function(){
			//io array should be of length vectorDim - drivesList.length
			ihtai.cycle([50, 50, 50, 50, 50, 50, 50, 50, 50]);
			ihtai.cycle([50, 50, 50, 50, 50, 50, 50, 50, 50]);
			ihtai.cycle([50, 50, 50, 50, 50, 50, 50, 50, 50]);
			var res=ihtai.cycle([50, 50, 50, 50, 50, 50, 50, 50, 50]);
		
		});	
	})
});

describe('ihtai utils', function(){
	describe('merge sort', function(){
		it('should sort an array of numbers', function(){
			var arr = [12, 7, 4 , 5, 100, 20, 6, 8, 1];
			var res = IhtaiUtils.mergeSort(arr, function(a, b){
				if(a < b)
					return true;
				else
					return false;
			});
			expect(res).toEqual([ 1, 4, 5, 6, 7, 8, 12, 20, 100 ]);
		})
	})

	describe('kd tree', function(){
		var arr, kdTree, root, heap;

		beforeEach(function(){
			arr=[
				[10, 5, 5, 3, 6],
				[8, 20, 25, 30, 1],
				[75, 50, 22, 20, 21],
				[60, 61, 58, 57, 77],
				[29, 2, 32, 20, 10]
			];

			kdTree = IhtaiUtils.KdTree(arr); 
			root = kdTree.getRoot();			
		});

		it('should create a tree', function(){


			expect(root.value).toEqual([29,2,32,20,10]);
			expect(root.left.value).toEqual([8,20,25,30,1]);
			expect(root.right.value).toEqual([60,61,58,57,77]);
			expect(root.left.left.value).toEqual([10,5,5,3,6]);
			expect(root.right.left.value).toEqual([75,50,22,20,21]);

		});

		it('should find the nearest neighbor to a vector', function(){
			nearestNeighbor = kdTree.nearestNeighbor([60, 61, 58, 57, 77]);
			expect(nearestNeighbor).toEqual([60, 61, 58, 57, 77]);
			var nn = kdTree.nearestNeighbor([1,1,1,1,1]);
			expect(nn).toEqual([10,5,5,3,6]);
			var nn2 = kdTree.nearestNeighbor([61, 58, 59, 61, 78]);
			expect(nn2).toEqual([60,61,58,57,77]);
		});

		it('should convert a kd tree into a binary heap', function(){
			heap=kdTree.toBinaryHeap();
			expect(heap[0]).toEqual([29,2,32,20,10]);
			expect(heap[1]).toEqual([8,20,25,30,1]);
			expect(heap[2]).toEqual([60,61,58,57,77]);
			expect(heap[3]).toEqual([10,5,5,3,6]);
			expect(heap[4]).toEqual(null);
			expect(heap[5]).toEqual([75,50,22,20,21]);
			for(var i=6;i<=10;i++){
				expect(heap[i]).toEqual(null);
			}
	
		});
		it('should convert a binary heap into a kd tree', function(){
			var inflatedRoot=IhtaiUtils.binaryHeapToKdTree(heap);
			
			expect(inflatedRoot.value).toEqual([29,2,32,20,10]);
			expect(inflatedRoot.left.value).toEqual([8,20,25,30,1]);
			expect(inflatedRoot.right.value).toEqual([60,61,58,57,77]);
			expect(inflatedRoot.left.left.value).toEqual([10,5,5,3,6]);
			expect(inflatedRoot.right.left.value).toEqual([75,50,22,20,21]);
		});
	});



})