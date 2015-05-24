describe('ihtai', function(){

	/*
	toBeJsonEqual matcher and replacer method originally from StackOverflow user 
	pocesar: http://stackoverflow.com/users/647380/pocesar
	http://stackoverflow.com/questions/14541287/jasmine-toequal-for-complex-objects-mixed-with-functions
	*/
	function replacer(k, v) {
	    if (typeof v === 'function') {
	        v = v.toString();
	    } else if (window['File'] && v instanceof File) {
	        v = '[File]';
	    } else if (window['FileList'] && v instanceof FileList) {
	        v = '[FileList]';
	    }
	    return v;
	}

	beforeEach(function(){
	    jasmine.addMatchers({
	        toBeJsonEqual: function(util, customEqualityTesters){
	        	return {
		        	compare:function(actual, expected){
		            	var one = JSON.stringify(actual, replacer).replace(/(\\t|\\n)/g,''),
		                two = JSON.stringify(expected, replacer).replace(/(\\t|\\n)/g,'');
		                var passed= one === two;
		                return {
	                		pass: passed,
	                		message: 'Expected ' + actual + (passed ? '' : ' not') + ' to equal ' + expected
		                };
		            }
		        }
	        }
	    });
	});

	afterEach(function(){

	});

	describe('Clusters', function(){
		var clusters;
		beforeEach(function(){
			clusters = new Clusters({_numClusters:1000, _vectorDim:5});

		});
		afterEach(function(){

		});


		it('should find nearest cluster for a vector', function(){
			clusters= new Clusters({_numClusters:1000, _vectorDim:5});
			var startDate=new Date();
			var res=clusters.findNearestCluster([50,50,50,50,50]);
			var endDate=new Date();
		
			var timeDiff=endDate.getTime()-startDate.getTime();
			console.log('findNearestCluster time: '+timeDiff);
			expect(res.id).toBe(0); //cluster 0 is specifically given this val during initialization
		});
	});

	describe('Memorizer', function(){
		var memorizer, memory, cluster;
		beforeEach(function(){
					
			memorizer = new Memorizer({_memoryHeight:100});

			memory=[10,20,30,40,50];
			cluster = {id:0, stm:memory};
			memorizer.memorize(cluster);
			var memory2=[50,40,30,20,10];
			var cluster2 = {id:1, stm:memory2};
			memorizer.memorize(cluster2);
			var memory3=[0,0,0,0,0];
			var cluster3 = {id:2, stm:memory3};
			memorizer.memorize(cluster3);

			var memory4=[30,30,30,30,30];
			var cluster4 = {id:3, stm:memory4};
			memorizer.memorize(cluster4);
			var memory5=[35,35,35,35,35];
			var cluster5 = {id:4, stm:memory5};
			memorizer.memorize(cluster5);
			var memory6=[40,40,40,40,40];
			var cluster6 = {id:5, stm:memory6};
			memorizer.memorize(cluster6);			
		});
		afterEach(function(){

		});

		it('should initialize memorizer', function(){
			expect(memorizer.getHeight()).toBe(100);
		});

		it('should memorize vectors', function(){
			var levels = memorizer.getLevels();

			expect(levels[0].series["3"].fs).toEqual([30,30,30,30,30]);
			expect(levels[0].series["3"].ss).toEqual([35,35,35,35,35]);
			expect(levels[0].series["3"].es).toEqual([35,35,35,35,35]);
		});		

		it('given a cluster, should return vector representing next action agent should take to minimize homeostasis differential', function(){
			var res=memorizer.query(cluster);
			/*
			Explanation: the final memory in the series starting with cluster reaches perfect homeostasis
			([0,0,0,0,0]). We expect res to equal the second vector in the series, [50,40,30,20,10]. This 
			is the 'next step' that IHTAI thinks agent should take to get as close as possible to homeostasis
			goal from current input stm.
			*/
	
			expect(res[0]).toEqual([50,40,30,20,10]);
		})

	});

	describe('Reflexes', function(){
		var reflexes;
		beforeEach(function(){
			var input=[];
			reflexes = new Reflexes([{
				init:function(){},
				matcher: function(stm){
					if(stm[3]===40)
						return true;
					else
						return false;
				}, 
				response: function(stm){
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
			var cluster = {id:0, stm:memory};
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
				cycle:function(stm){
					if(stm[0] > 50)
						this.v=0;
					else
						this.v++;
					return this.v;
				},
				targetval:0
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
		var ihtai, drives, reflexList, drive, reflexes;
		beforeEach(function(){
			drive={
				v:5,
				init:function(){
					this.v=5;
					return this.v;
				},
				cycle:function(stm){
					if(stm[0] > 50)
						this.v=0;
					else
						this.v++;
					return this.v;
				},
				targetval:0
			};
			drives=[drive];

			reflexes = [{
				init: function(){},
				matcher: function(stm){
					if(stm[3]===40)
						return true;
					else
						return false;
				}, 
				response: function(stm){
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

		it('should cycle when presented with io stm', function(){
			//io array should be of length vectorDim - drivesList.length
			ihtai.cycle([10, 20, 30, 40, 50, 60, 70, 80, 90]);
			ihtai.cycle([90, 80, 70, 60, 50, 40, 30, 20, 10]);
			ihtai.cycle([0, 100, 0, 100, 0, 100, 0, 100, 0]);
			var res=ihtai.cycle([50, 50, 50, 50, 50, 50, 50, 50, 50]);
		
		});	

		it('should save an instance as JSON and then re-inflate into working ihtai', function(){
			var resp=ihtai.toJsonString('ihtaiSave');
			var rebuiltIhtai=new Ihtai(resp);
			//re-inflated Ihtai should be identical to original instance
			expect(ihtai).toBeJsonEqual(rebuiltIhtai);

			//compare cycle results from orig and rebuilt ihtai
			rebuiltIhtai.cycle([0, 50, 0, 50, 0, 50, 0, 50, 0], 33);
			rebuiltIhtai.cycle([0, 50, 0, 50, 0, 50, 0, 50, 0], 33);
			rebuiltIhtai.cycle([0, 50, 0, 50, 0, 50, 0, 50, 0], 33);
			rebuiltIhtai.cycle([0, 50, 0, 50, 0, 50, 0, 50, 0], 33);
			var rebuiltRes=rebuiltIhtai.cycle([0, 50, 0, 50, 0, 50, 0, 50, 0], 33);
			
			ihtai.cycle([0, 50, 0, 50, 0, 50, 0, 50, 0], 33);
			ihtai.cycle([0, 50, 0, 50, 0, 50, 0, 50, 0], 33);
			ihtai.cycle([0, 50, 0, 50, 0, 50, 0, 50, 0], 33);
			ihtai.cycle([0, 50, 0, 50, 0, 50, 0, 50, 0], 33);
			var origRes=ihtai.cycle([0, 50, 0, 50, 0, 50, 0, 50, 0], 33);
						
			expect(rebuiltRes.memorizerOutput).toEqual(origRes.memorizerOutput);			

		});

		/*
		TODO: test save and load with the following recently-added functionality:
		-weighted distribution of cluster vectors
		-new Memorizer cluster averaging and selection algorithmic data
		*/

		it('should create an Ihtai instance with back-stm', function(){
			var ihtai2 = new Ihtai({
				clusterCount:1000,
				vectorDim:10,
				memoryHeight:100,
				drivesList:drives,
				reflexList:reflexes,
				acceptableRange:80,
				bStmCt:1
			});

			ihtai2.cycle([0, 50, 0, 50, 0, 50, 0, 50, 0], 33);
			ihtai2.cycle([0, 50, 0, 50, 0, 50, 0, 50, 0], 33);
			ihtai2.cycle([50, 50, 50, 50, 50, 50, 50, 50, 50], 33);
		});

/*		it('should implement back-stm correctly on re-inflated Ihtai instances', function(){
			var ihtai = new Ihtai({
				clusterCount:1000,
				vectorDim:10,
				memoryHeight:100,
				drivesList:drives,
				reflexList:reflexes,
				acceptableRange:100000,
				bStmCt:1
			});

			var resp=ihtai.toJsonString('ihtaiSave');
			var rebuiltIhtai=new Ihtai(resp);
			//re-inflated Ihtai should be identical to original instance
			expect(ihtai).toBeJsonEqual(rebuiltIhtai);

			//compare cycle results from orig and rebuilt ihtai
			rebuiltIhtai.cycle([0, 50, 0, 50, 0, 50, 0, 50, 0], 33);
			rebuiltIhtai.cycle([0, 50, 0, 50, 0, 50, 0, 50, 0], 33);
			rebuiltIhtai.cycle([0, 50, 0, 50, 0, 50, 0, 50, 0], 33);
			rebuiltIhtai.cycle([0, 50, 0, 50, 0, 50, 0, 50, 0], 33);
			rebuiltIhtai.cycle([0, 50, 0, 50, 0, 50, 0, 50, 0], 33);
			rebuiltIhtai.cycle([0, 50, 0, 50, 0, 50, 0, 50, 0], 33);
			var rebuiltRes=rebuiltIhtai.cycle([0, 50, 0, 50, 0, 50, 0, 50, 0], 33);
			
			ihtai.cycle([0, 50, 0, 50, 0, 50, 0, 50, 0], 33);
			ihtai.cycle([0, 50, 0, 50, 0, 50, 0, 50, 0], 33);
			ihtai.cycle([0, 50, 0, 50, 0, 50, 0, 50, 0], 33);
			ihtai.cycle([0, 50, 0, 50, 0, 50, 0, 50, 0], 33);
			ihtai.cycle([0, 50, 0, 50, 0, 50, 0, 50, 0], 33);
			ihtai.cycle([0, 50, 0, 50, 0, 50, 0, 50, 0], 33);
			var origRes=ihtai.cycle([0, 50, 0, 50, 0, 50, 0, 50, 0], 33);
					
			expect(rebuiltRes.memorizerOutput).toEqual(origRes.memorizerOutput);	
		});
*/		
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

	//TODO:add distSq unit test
	describe('distSq', function(){
		it('', function(){

		});
	});

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
			expect(root.val).toEqual([29,2,32,20,10]);
			expect(root.l.val).toEqual([8,20,25,30,1]);
			expect(root.r.val).toEqual([60,61,58,57,77]);
			expect(root.l.l.val).toEqual([10,5,5,3,6]);
			expect(root.r.l.val).toEqual([75,50,22,20,21]);

		});

		it('should find the nearest neighbor to a vector', function(){
			nearestNeighbor = kdTree.nearestNeighbor([60, 61, 58, 57, 77]);
			expect(nearestNeighbor).toEqual([60, 61, 58, 57, 77]);
			var nn = kdTree.nearestNeighbor([1,1,1,1,1]);
			expect(nn).toEqual([10,5,5,3,6]);
			
			var nn2 = kdTree.nearestNeighbor([61, 58, 59, 61, 78]); //10 //
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
			var inflatedRoot=IhtaiUtils.binaryHeapToKdTreeRoot(heap);

			expect(inflatedRoot.val).toEqual([29,2,32,20,10]);
			expect(inflatedRoot.l.val).toEqual([8,20,25,30,1]);
			expect(inflatedRoot.r.val).toEqual([60,61,58,57,77]);
			expect(inflatedRoot.l.l.val).toEqual([10,5,5,3,6]);
			expect(inflatedRoot.r.l.val).toEqual([75,50,22,20,21]);
		});
	});

	describe('binary heap', function(){
		var minHeap;
		beforeEach(function(){
			minHeap=IhtaiUtils.MinHeap();
			minHeap.insert({sd:9});
			minHeap.insert({sd:3});
			minHeap.insert({sd:7});
			minHeap.insert({sd:5});
			minHeap.insert({sd:2});
			minHeap.insert({sd:8});			

		});

		it('should add elements to heap and maintain heap property', function(){
			var sortedList=[];
			var l=minHeap.heap.length;
			for(var i=0;i<l; i++){
				sortedList.push(minHeap.popMin());
			}
			var tstArr=[2, 3, 5, 7, 8, 9];
			for(var i=0;i<sortedList.length;i++){
				expect(sortedList[i].sd).toEqual(tstArr[i]);
			}
		});
		it('should edit the value of a heap element, and maintain heap property after calling minHeapify on it', function(){
			var indx=minHeap.heap.length-1;
			minHeap.heap[indx]={sd:1};
			minHeap.minHeapify(indx);
			expect(minHeap.getMin().sd).toBe(1);

			minHeap.heap[0]={sd:9999};
			minHeap.minHeapify(0);
			expect(minHeap.getMin().sd).toBe(2);

			var tstArr=[2, 3, 7, 9, 5, 9999];
			for(var i=0;i<minHeap.heap.length;i++){
				expect(minHeap.heap[i].sd).toEqual(tstArr[i]);
			}
		});
		it('should remove the smallest element from heap', function(){
			var min=minHeap.popMin();
			expect(min.sd).toBe(2);
			var tstArr=[3, 5, 7, 9, 8];
			for(var i=0;i<minHeap.heap.length;i++){
				expect(minHeap.heap[i].sd).toEqual(tstArr[i]);
			}
		});
		it('should perform heapify on all elements', function(){
			minHeap.heap[0]={sd:77};
			minHeap.heap[3]={sd:5000};
			minHeap.heap[2]={sd:1};
			minHeap.minHeapifyAll();
			var tstArr=[1, 3, 8, 5000, 5, 77];
			for(var i=0;i<minHeap.heap.length;i++){
				expect(minHeap.heap[i].sd).toEqual(tstArr[i]);
			}
		});
	});



})