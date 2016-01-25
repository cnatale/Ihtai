/**
Copyright (c) 2015 Chris Natale

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
**/

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
	        toBeJsonEqual: function(expected){
	            var one = JSON.stringify(this.actual, replacer).replace(/(\\t|\\n)/g,''),
	                two = JSON.stringify(expected, replacer).replace(/(\\t|\\n)/g,'');

	            return one === two;
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
			var res=clusters.findNearestCluster([50,50,50,50,50]);
			expect(res.id).toBe(0);
			expect(res.stm).toEqual([50,50,50,50,50]);
		});

		it('should add a cluster when passed a vector', function(){
			clusters= new Clusters({_numClusters:1000, _vectorDim:5});
			clusters.addCluster([50,50,50,50,50]);
			var res=clusters.getRandomCluster();
			expect(res.id).toBe(0);
			expect(res.stm).toEqual([50,50,50,50,50]);			
		});
	});

	describe('Memorizer', function(){
		var memorizer, memory, memory2, memory3, memory4, memory5, memory6, cluster;
		beforeEach(function(){
					
			memorizer = new Memorizer({_memoryHeight:100});

			memory=[{id:0, stm:[10,20,30]},{id:0, stm:[40]},{id:0, stm:[50]}];
			memorizer.memorize(memory);

			memory2=[{id: 1, stm:[50,40,30]},{id: 1, stm:[20]},{id: 1, stm:[10]}];
			memorizer.memorize(memory2);

			memory3=[{id: 2, stm:[0,0,0]},{id: 2, stm:[0]},{id: 2, stm:[0]}];
			memorizer.memorize(memory3);

			memory4=[{id: 3, stm:[30,30,30]},{id: 3, stm:[30]},{id: 3, stm:[30]}];
			memorizer.memorize(memory4);

			memory5=[{id: 4, stm:[35,35,35]},{id: 4, stm:[35]},{id: 4, stm:[35]}];
			memorizer.memorize(memory5);

			memory6=[{id: 5, stm:[40,40,40]},{id: 0, stm:[40]},{id: 5, stm:[40]}];
			memorizer.memorize(memory6);			
		});
		afterEach(function(){

		});

		it('should initialize memorizer', function(){
			expect(memorizer.getHeight()).toBe(100);
		});

		//TODO: these aren't currently working. add tests back in when red-black tree is implemented
		it('should memorize vectors', function(){
			var levels = memorizer.getLevels();
			/*for(var i in levels[0].series["3+3+3"]){
				if(levels[0].series["3+3+3"].hasOwnProperty(i))
					console.log('prop: '+ levels[0].series["3+3+3"][i]);
			}*/
			//expect(levels[0].series["3+3+3"].fs).toEqual(jasmine.objectContaining(memory4));
			//expect(levels[0].series["3+3+3"].ss).toEqual(jasmine.objectContaining(memory5));
			//expect(levels[0].series["3+3+3"].es).toEqual(jasmine.objectContaining({stm:[35]}));
		});		

		it('given a cluster, should return vector representing next action agent should take to minimize homeostasis differential', function(){
			var res=memorizer.query(memory);
			/*
			Explanation: the final memory in the series starting with cluster reaches perfect homeostasis
			([0]). We expect res to equal the second vector in the series, memory2. This 
			is the 'next step' that IHTAI thinks agent should take to get as close as possible to homeostasis
			goal from current input stm.
			*/
			expect(res[0]).toEqual(jasmine.objectContaining(memory2));
		});

		it('should test copyTemporalData method', function(){
			//TODO: add tests for copyTemporalData method
		});

	});

	describe('Drives', function(){
		var drives, cluster;
		beforeEach(function(){
			//creates a simple drive object
			var drive={
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
				undo:function(){

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
					/*if(stm[0] > 50)
						this.v=0;
					else
						this.v++;*/
					return this.v;
				},
				undo:function(){
				},
				targetval:0
			};
			drives=[drive];

			//initiliaze an ihtai with 9 dimensional i/o signal and 1d drive signal
			ihtai = new Ihtai({
				clusterCount:1000,
				vectorDim:10,
				memoryHeight:2,
				drivesList:drives,
				acceptableRange:9999,
				distanceAlgo:"avg" /*avg or endState*/,
				inputClusterDim:8,
				outputClusterDim:1,
				driveClusterDim:1,
			});
		});
		afterEach(function(){

		});

		it('should cycle when presented with io stm', function(){
			//io array should be of length vectorDim - drivesList.length
			ihtai.cycle([[10, 20, 30, 40, 50, 60, 70, 80], [90]], 33);
			ihtai.cycle([[90, 80, 70, 60, 50, 40, 30, 20], [10]], 33);
			ihtai.cycle([[0, 100, 0, 100, 0, 100, 0, 100], [0]], 33);
			var res=ihtai.cycle([[50, 50, 50, 50, 50, 50, 50, 50], [50]], 33);
		});	

		it('should save an instance as JSON and then re-inflate into working ihtai', function(){
			/*function areAllFnsDeclared(a){
				var fnNames=['areMemoriesEnabled','areReflexesEnabled','cycle','daydream','enableMemories','enableReflexes',
					'getProperties','toJsonString'];
				
				for(var i=0;i<fnNames.length;i++){
					if(typeof a[fnNames[i]]=='undefined')
						return false;
				}				
				return true;
			}

			ihtai.cycle([[0, 50, 0, 50, 0, 50, 0, 50], [0]], 33);
			ihtai.cycle([[10, 20, 0, 30, 0, 50, 0, 50], [0]], 33);
			ihtai.cycle([[0, 50, 0, 10, 0, 50, 30, 5], [10]], 33);
			ihtai.cycle([[30, 10, 0, 0, 0, 0, 0, 0], [0]], 33);			

			var resp=ihtai.toJsonString('ihtaiSave');
			var rebuiltIhtai=new Ihtai(resp);
			//re-inflated Ihtai should be identical to original instance
			//check that the new object has been created (this check doesn't look for properties)
			expect(ihtai).toBeJsonEqual(rebuiltIhtai);
			//guarantee that all public functions have been declared in rebuilt instance.
			expect(areAllFnsDeclared(rebuiltIhtai)).toBe(true);

			//compare cycle results from orig and rebuilt ihtai
			var rebuiltRes=ihtai.cycle([[0, 50, 0, 50, 0, 50, 0, 50], [0]], 33);
			var origRes=ihtai.cycle([[0, 50, 0, 50, 0, 50, 0, 50], [0]], 33);
		
			expect(rebuiltRes.memorizerOutput[0]).toEqual(origRes.memorizerOutput[0]);
			expect(rebuiltRes.memorizerOutput[1]).toEqual(origRes.memorizerOutput[1]);	

			//Capture situation where cache is full and kd-tree is built before instance is saved.	
			//note that low cluster count triggers kd-tree early
			ihtai = new Ihtai({
				clusterCount:4,
				vectorDim:10,
				memoryHeight:2,
				drivesList:drives,
				reflexList:reflexes,
				acceptableRange:9999,
				distanceAlgo:"avg"
			});		

			ihtai.cycle([[0, 50, 0, 50, 0, 50, 0, 50], [0]], 33);
			ihtai.cycle([[10, 20, 0, 30, 0, 50, 0, 50], [0]], 33);
			ihtai.cycle([[0, 50, 0, 10, 0, 50, 30, 5], [10]], 33);
			ihtai.cycle([[30, 10, 0, 0, 0, 0, 0, 0], [0]], 33);		
			
			resp=ihtai.toJsonString('ihtaiSave');
			rebuiltIhtai=new Ihtai(resp);
			//re-inflated Ihtai should be identical to original instance
			//check that the new object has been created (this check doesn't look for properties)
			expect(ihtai).toBeJsonEqual(rebuiltIhtai);
			//guarantee that all public functions have been declared in rebuilt instance.
			expect(areAllFnsDeclared(rebuiltIhtai)).toBe(true);

			//Compare cycle results from orig and rebuilt ihtai using stimuli that both intances have already experienced.
			rebuiltRes=ihtai.cycle([[0, 50, 0, 50, 0, 50, 0, 50], [0]], 33);
			origRes=ihtai.cycle([[0, 50, 0, 50, 0, 50, 0, 50], [0]], 33);
		
			expect(rebuiltRes.memorizerOutput[0]).toEqual(origRes.memorizerOutput[0]);
			expect(rebuiltRes.memorizerOutput[1]).toEqual(origRes.memorizerOutput[1]);	

			//Pass in novel stimuli to make sure kd-tree is selecting same nearest neighbor for both instances.
			rebuiltRes=ihtai.cycle([[99, 50, 0, 50, 0, 50, 0, 50], [0]], 33);
			origRes=ihtai.cycle([[99, 50, 0, 50, 0, 50, 0, 50], [0]], 33);

			expect(rebuiltRes.memorizerOutput[0]).toEqual(origRes.memorizerOutput[0]);
			expect(rebuiltRes.memorizerOutput[1]).toEqual(origRes.memorizerOutput[1]);	
			*/
		});
	})

	it('Should test exportTemporalDataAsCSV method', function(){
		//TODO: add exportTemporalDataAsCSV method
	});
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

		it('should calculate the square distance between two vectors', function(){
			var res = kdTree.distSq([2,2],[0,0]);
			expect(res).toBe(8);
			res = kdTree.distSq([2,2],[3,5]);
			expect(res).toBe(10);
			res = kdTree.distSq([2,2],[-3,-5]);
			expect(res).toBe(74);
		});		

		it('should create a tree', function(){
			//this is where tests with sinon fail
			expect(root.val).toEqual([29,2,32,20,10]);
			expect(root.l.val).toEqual([8,20,25,30,1]);
			expect(root.r.val).toEqual([60,61,58,57,77]);
			expect(root.l.l.val).toEqual([10,5,5,3,6]);
			expect(root.r.l.val).toEqual([75,50,22,20,21]);
		});

		it('should find the nearest neighbor to a vector', function(){
			var nn = kdTree.nearestNeighbor([60, 61, 58, 57, 77]);
			expect(nn).toEqual([60, 61, 58, 57, 77]);
			nn = kdTree.nearestNeighbor([1,1,1,1,1]);
			expect(nn).toEqual([10,5,5,3,6]);
			nn = kdTree.nearestNeighbor([61, 58, 59, 61, 78]);
			expect(nn).toEqual([60,61,58,57,77]);
			nn=kdTree.nearestNeighbor([79, 55, 18, 19, 24]);
			expect(nn).toEqual([75,50,22,20,21]);
			nn=kdTree.nearestNeighbor([-5, -10, -5, -2, 10]);
			expect(nn).toEqual([10,5,5,3,6]);	
			nn=kdTree.nearestNeighbor([100, 100, 90, 200, 150]);
			expect(nn).toEqual([60,61,58,57,77]);
		});

		it('should generate a lot of random points, add to tree, and make sure all are in tree', function(){
			var dim=7; //number of dimensions
			var arr=[], nn, numVecs=10000;
			for(var i=0;i<numVecs;i++){
				var vec=[];
				for (var j=0;j<7;j++){
					vec[j]=Math.round(Math.random()*100);
				}
				arr.push(vec);
			}
			var kdTree = IhtaiUtils.KdTree(arr); 

			//make sure all elements are in the tree
			for(i=0;i<numVecs;i++){
				nn=kdTree.nearestNeighbor(arr[i]);
				expect(nn).toEqual(arr[i]);
			}
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
		var minHeap, maxHeap;
		beforeEach(function(){
			minHeap=IhtaiUtils.Heap("min");
			minHeap.insert({sd:9, lvl:10});
			minHeap.insert({sd:3, lvl:20});
			minHeap.insert({sd:7, lvl:30});
			minHeap.insert({sd:5, lvl:40});
			minHeap.insert({sd:2, lvl:50});
			minHeap.insert({sd:8, lvl:60});		

			maxHeap=IhtaiUtils.Heap("max");
			maxHeap.insert({sd:9, lvl:10});
			maxHeap.insert({sd:3, lvl:20});
			maxHeap.insert({sd:7, lvl:30});
			maxHeap.insert({sd:5, lvl:40});
			maxHeap.insert({sd:2, lvl:50});
			maxHeap.insert({sd:8, lvl:60});					

		});

		it('should have the correct number of elements after insertions', function(){
			//relying on six insertions from beforeEach()
			expect(minHeap.heap.length).toBe(6);
		});

		it('should add elements to heap and maintain heap property', function(){
			//minheap
			var sortedList=[];
			var l=minHeap.heap.length;
			for(var i=0;i<l; i++){
				sortedList.push(minHeap.pop());
			}
			var tstArr=[2, 3, 5, 7, 8, 9];
			for(var i=0;i<sortedList.length;i++){
				expect(sortedList[i].sd).toEqual(tstArr[i]);
			}

			//maxheap
			sortedList=[];
			var l=maxHeap.heap.length;
			for(var i=0;i<l; i++){
				sortedList.push(maxHeap.pop());
			}

			tstArr=[9,8,7,5,3,2];
			for(var i=0;i<sortedList.length;i++){
				expect(sortedList[i].sd).toEqual(tstArr[i]);
			}			
		});

		it('should maintain secondary sorting based on lvl property', function(){
			//minheap
			var minHeap=IhtaiUtils.Heap();
			minHeap.insert({sd:8, lvl:60});
			minHeap.insert({sd:8, lvl:20});
			minHeap.insert({sd:8, lvl:30});
			minHeap.insert({sd:8, lvl:40});
			minHeap.insert({sd:8, lvl:10});
			minHeap.insert({sd:8, lvl:60});	

			var minElm=minHeap.pop();
			expect(minElm.lvl).toEqual(10);	

			//maxheap
			var maxHeap=IhtaiUtils.Heap();
			maxHeap.insert({sd:8, lvl:60});
			maxHeap.insert({sd:8, lvl:20});
			maxHeap.insert({sd:8, lvl:30});
			maxHeap.insert({sd:8, lvl:40});
			maxHeap.insert({sd:8, lvl:10});
			maxHeap.insert({sd:8, lvl:60});	

			var maxElm=maxHeap.pop();
			expect(maxElm.lvl).toEqual(10);
		})

		it('minheap should generate a lot of points, add to heap, while always keeping minimum value in position 0', function(){
			var minVal=Infinity, minHeap, curVal, numElms=10000;
			minHeap=IhtaiUtils.Heap("min");
			for(var i=0;i<numElms;i++){
				curVal=Math.round(Math.random()*100);
				minHeap.insert({sd:curVal, lvl:i});
				if(curVal<minVal)
					minVal=curVal;
			}

			expect(minHeap.peek().sd).toBe(minVal);
		});

		it('maxheap should generate a lot of points, add to heap, while always keeping maximum value in position 0', function(){
			var maxVal=0, maxHeap, curVal, numElms=10000;
			maxHeap=IhtaiUtils.Heap("max");
			for(var i=0;i<numElms;i++){
				curVal=Math.round(Math.random()*1000);
				maxHeap.insert({sd:curVal, lvl:i});
				if(curVal>maxVal)
					maxVal=curVal;
			}

			expect(maxHeap.peek().sd).toBe(maxVal);
		});		

		it('should edit the value of a heap element, and maintain heap property after calling minHeapify on it', function(){
			var indx=minHeap.heap.length-1;
			minHeap.heap[indx]={sd:1};
			minHeap.minHeapify(indx);
			expect(minHeap.peek().sd).toBe(1);

			minHeap.heap[0]={sd:9999};
			minHeap.minHeapify(0);
			expect(minHeap.peek().sd).toBe(2);

			var tstArr=[2, 3, 7, 9, 5, 9999];
			for(var i=0;i<minHeap.heap.length;i++){
				expect(minHeap.heap[i].sd).toEqual(tstArr[i]);
			}
		});
		it('should edit the value of a heap element, and maintain heap property after calling maxHeapify on it', function(){
			var indx=maxHeap.heap.length-1;
			maxHeap.heap[indx]={sd:999999999};
			maxHeap.maxHeapify(indx);
			expect(maxHeap.peek().sd).toBe(999999999);

			//change the large number in maxheap position to 0
			maxHeap.heap[0]={sd:0};
			maxHeap.maxHeapify(0);
			//9 should be the larges number left in the heap
			expect(maxHeap.peek().sd).toBe(9);

			var tstArr=[9, 5, 8, 3, 2, 0];
		
			for(var i=0;i<maxHeap.heap.length;i++){
				expect(maxHeap.heap[i].sd).toEqual(tstArr[i]);
			}
		});

		it('pop() should remove the smallest element from minheap', function(){
			var min=minHeap.pop();
			expect(min.sd).toBe(2);
			var tstArr=[3, 5, 7, 9, 8];
			for(var i=0;i<minHeap.heap.length;i++){
				expect(minHeap.heap[i].sd).toEqual(tstArr[i]);
			}
		});
		it('pop() should remove the largest element from maxheap', function(){
			var max=maxHeap.pop();
			expect(max.sd).toBe(9);
			var tstArr=[3, 5, 7, 9, 8];

			expect(maxHeap.heap[0].sd).toEqual(8);
			/*for(var i=0;i<maxHeap.heap.length;i++){
				expect(maxHeap.heap[i].sd).toEqual(tstArr[i]);
			}*/
		});		
		it('should remove elements from heap when pop() is called', function(){
			//minheap
			for(var i=0;i<6;i++){
				minHeap.pop();
			}
			expect(minHeap.heap.length).toBe(0);

			//maxheap
			for(var i=0;i<6;i++){
				maxHeap.pop();
			}
			expect(maxHeap.heap.length).toBe(0);
		})
		it('should perform heapify on all elements', function(){
			//minheap
			minHeap.heap[0]={sd:77};
			minHeap.heap[3]={sd:5000};
			minHeap.heap[2]={sd:1};
			minHeap.minHeapifyAll();
			var tstArr=[1, 3, 8, 5000, 5, 77];
			for(var i=0;i<minHeap.heap.length;i++){
				expect(minHeap.heap[i].sd).toEqual(tstArr[i]);
			}

			//maxheap
			maxHeap.heap[0]={sd:77};
			maxHeap.heap[3]={sd:5000};
			maxHeap.heap[2]={sd:1};
			maxHeap.maxHeapifyAll();
			tstArr=[5000, 77, 7, 5, 2, 1];
			for(var i=0;i<maxHeap.heap.length;i++){
				expect(maxHeap.heap[i].sd).toEqual(tstArr[i]);
			}			
		});
		it('should dequeue the values 1 to 50 in order when randomly inserted', function(){
			//minheap
			var minHeap=IhtaiUtils.Heap("min");
			var inputArr=[], rnd;
			for(var i=0;i<50;i++){
				inputArr[i]=i+1;
			}

			//insert elements randomly into minheap
			var ctr=49;
			for(i=0;i<50;i++){
				rnd=Math.round(Math.random()*ctr);
				minHeap.insert({sd:inputArr[rnd]});
				inputArr.splice(rnd, 1);
				ctr--;
			}

			//make sure elements output in order
			for(i=1;i<=50;i++){
				expect(minHeap.pop().sd).toEqual(i);
			}

			//maxheap
			var maxHeap=IhtaiUtils.Heap("max");
			inputArr=[];
			for(var i=0;i<50;i++){ //insert values 1-50 into array
				inputArr[i]=i+1;
			}

			//insert elements randomly into maxheap
			var ctr=49;
			for(i=0;i<50;i++){
				rnd=Math.round(Math.random()*ctr);
				maxHeap.insert({sd:inputArr[rnd]});
				inputArr.splice(rnd, 1);
				ctr--;
			}

			//make sure elements output in order
			for(i=50;i>0;i--){
				expect(maxHeap.pop().sd).toEqual(i);
			}			
		});
	});

})