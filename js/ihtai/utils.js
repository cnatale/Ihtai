if(typeof IhtaiUtils == "undefined")
	var IhtaiUtils={};

String.prototype.escapeSpecialChars = function() {
    return this.replace(new RegExp("\n", "g"), "\\n")
               .replace(new RegExp("\'", "g"), "\\'")
               .replace(new RegExp('\"', "g"), '\\"')
               .replace(new RegExp("\&", "g"), "\\&")
               .replace(new RegExp("\r", "g"), "\\r")
               .replace(new RegExp("\t", "g"), "\\t")
               .replace(new RegExp("\b", "g"), "\\b")
               .replace(new RegExp("\f", "g"), "\\f");
};

// code from http://stackoverflow.com/questions/8435183/generate-a-weighted-random-number
IhtaiUtils.weightedRand = (function(spec) {
  	var i, j, table=[];
  	for (i in spec) {
    // The constant 10 below should be computed based on the
    // weights in the spec for a correct and optimal table size.
    // E.g. the spec {0:0.999, 1:0.001} will break this impl.
    	for (j=0; j<spec[i]*10; j++) {
      		table.push(i);
		}
	}

	return Number(table[Math.floor(Math.random() * table.length)]);
});



IhtaiUtils.loadFile = (function(fileStr){
	/*
	useful link for loading local file-system data: http://stackoverflow.com/questions/7346563/loading-local-json-file
	*/

	//convert string to json
	var parsedFile=JSON.parse(fileStr);
	var ihtai= new Ihtai(parsedFile);
	return ihtai; //return the inflated Ihtai instance 
});

/**
By implementing this using a binary heap array approach, we get O(n) tree load time vs. O(n*log(n)^2) for 
the standard kd-tree builder algorithm without the data already ordered.

Each element in the heap param contains a kd-tree's .val property
*/
IhtaiUtils.binaryHeapToKdTreeRoot = (function(heap){
	var root,node, parent;
	for(var i=0;i<heap.length;i++){
		if(heap[i]!=null){
			node={
				val:heap[i]
			}
			heap[i]=node; //replace val with inflated object

			if(i==0)
				root=node;
			else{
				parent=heap[Math.floor((i-1)/2)];
				if(!parent.hasOwnProperty('l'))
					parent.l=node;
				else
					parent.r=node;
			}			
		}
	}

	return root;
});

/*TODO: create binary heap with following capabilities:
-create binary heap stored in array
-add to heap
-remove/update from any place in heap
-return element with lowest value
*/
IhtaiUtils.MinHeap = (function(){
	var heap;
	function init(){
		heap=[];
	}
	init();

	function insert(node){
		/*
		-Add element to end of heap
		-compare element with its parent. if greater than parent, stop
		-If less than parent, swap element with its parent and return to previous step
		*/
		heap.push(node);

		function compare(node){
			var par=par(node);
			if(heap[node]<heap[par]){
				var tmp;
				tmp=heap[node];
				heap[node]=heap[par];
				heap[par]=tmp;

				compare(par);
			}

			function par(i){
				return Math.floor((i-1)/2);
			}		
		}

		compare(heap.length-1);
	}

	function minHeapify(){
		/*Assume that heap[i]'s left and right children are min-heaps, but heap[i] might be larger than
		  its children, thus violating the min-heap property. The value of heap[i] floats down so that subtree rooted
		  at index obeys the min-heap property. 
		*/
		function siftDown(i){
			var l=left(i), r=right(i), smallest;
			if(heap[l] && heap[l] < heap[i])
				smallest= l;
			else
				smallest= i;

			if(heap[r] && heap[r] < heap[smallest])
				smallest= r;

			if(smallest != i){
				//swap heap[i] with heap[smallest]
				var tmp;
				tmp=heap[i];
				heap[i]=heap[smallest];
				heap[smallest]=tmp;

				minHeapify(smallest);
			}
		}

		var start=Math.floor((heap.length -2)/2);
		while(start >= 0){
			siftDown(start);
			start-=1;
		}
	}

	function popMin(){
		var minItm=heap[0];
		var endItm=heap[heap.length-1];
		heap[0]=endItm;
		heap.pop();
		minHeapify(0);
		return minItm;
	}

	function left(i){
		return i*2 + 1;
	}
	function right(i){
		return i*2 + 2;
	}
	function par(i){
		return Math.floor((i-1)/2);
	}

	function getMin(){
		return heap[0];
	}

	return{
		insert:insert,
		minHeapify:minHeapify,
		popMin:popMin,
		getMin:getMin,
		heap:heap
	}
});

IhtaiUtils.KdTree = (function(_data, _comparisonProp, useExistingTree){
	var comparisonProp=_comparisonProp;
	var data=_data, cache=[];
	var root;

	function init(){
		if(typeof useExistingTree != 'undefined' && useExistingTree){
			root=_data; //the tree is already built, no need to build again
		}
		else{
			root = buildKdTree(data);
		}
	}
	init();


	function toBinaryHeap(){
		var queue=new Queue(),output=[],node;
		queue.enqueue(root);
		while(queue.getLength()>0){
			node=queue.dequeue();
			if(node!=null){
				queue.enqueue(node.l);
				queue.enqueue(node.r);
				output.push(node.val);
			}
			else
				output.push(node);
		}
		return output;
	}

	/**
		@param data: an array of n-dimensional vals
	*/
	function buildKdTree(data){
		/*
		For each level l, split array of n-dimensional points along median of 
		dimension l % d. Assign median point to node. Recursively perform operation on
		l and r sub-arrays.
		*/

		//each node contains the following properties: l, r, and val		

		//TODO: this net line is the entirety of poor load performance
		var root=createNode(data,0); //this will recursively build the entire kd-tree, with reference to root
		return root;

		function createNode(data, lvl){
			var node;

			if(data.length<2){
				//base case. don't do any more splitting. 
				//create node, return node. stop recursion.
				node={
					val:data[0],
					l:null,
					r:null
				}
				return node;
			}
			else{
				var median, medianIndex, dimensionality, dim, l, r;
				//assumes all elements are of same dimension
				if(typeof comparisonProp==="function"){
					dimensionality=comparisonProp.call(data[0]).length;
				}
				else if(typeof comparisonProp==="string"){
					dimensionality=data[comparisonProp].length;
				}
				else
					dimensionality=data.length;

				dim = lvl % dimensionality;

				//sort array by current dimension
				var sortedData=IhtaiUtils.mergeSort(data, function(a, b){
					var comparison;

					if(typeof comparisonProp==="function"){
						if(!cache[a.id])
							cache[a.id]=comparisonProp.call(a);
						var av=cache[a.id];
						if(!cache[b.id])
							cache[b.id]=comparisonProp.call(b);
						var bv=cache[b.id];					

						comparison=av[dim] < bv[dim];
					}
					else if(typeof comparisonProp==="string"){
						comparison=a[comparisonProp][dim] < b[comparisonProp][dim];
					}
					else
						comparison=a[dim] < b[dim];
					if(comparison)
						return true;
					else
						return false;
				});

				//this prevents median and l from referencing same point if length=2 
				if(sortedData.length==2){
					node = {
						val:sortedData[1],
						l:createNode([sortedData[0]], lvl+1),
						r:null
					}
				}
				else{
					medianIndex=Math.floor(sortedData.length/2);
					median=sortedData[medianIndex];
					l=sortedData.slice(0,medianIndex);
					r=sortedData.slice(medianIndex+1);

					//create node.
					node = {
						val:median,
						l:createNode(l, lvl+1),
						r:createNode(r, lvl+1)
					}					
				}

				return node;
			}
		}
	}

	/**
	Perform nearest neighbor search on kd-tree.
	@param v the vector to use when performing nearest neighbor search
	nodes have properties l, r, and val
	*/
	function nearestNeighbor(pt, cmpr){
		var bestPt, bestDist=Infinity;
		/*if(typeof cmpr !="undefined"){
			//offers a way to overried default comparisonProp for kd tree
			var comparisonProp = cmpr;
		}*/
	
		nn(root, 0);
		//cache=[];
		return bestPt;

		function nn(node, lvl){
			var l=1, r=-1, dir;
			var dim=lvl % pt.length;

			if(node==null)
				return;

			var nv;
			if(typeof comparisonProp==="function"){
				if(!cache[node.val.id])
					cache[node.val.id]=comparisonProp.call(node.val);
				nv=cache[node.val.id];	
			}
			else if(typeof comparisonProp=="string"){
				nv=node.val[comparisonProp]
			}
			else{
				nv=node.val;
			}

			if(pt[dim] < nv[dim]){
				//descend l
				nn(node.l, lvl+1);
				dir=l;
			}
			else{
				//descend r
				nn(node.r, lvl+1);
				dir=r;
			}

			//check if current node is closer than current best
			var d=distSq(nv, pt);
			if(d<bestDist){
				bestDist=d;
				bestPt=node.val;
			}

			/*
			Whichever way we went, check other child node to see if it could be closer.
			If so, descend.
			*/
			var bpv;
			if(typeof comparisonProp==="function"){
				try{
					if(!cache[bestPt.id])
						cache[bestPt.id]=comparisonProp.call(bestPt);
					var bpv=cache[bestPt.id];
				}
				catch(e){
					debugger;
				}
			}
			else if(typeof comparisonProp=="string"){
				bpv=bestPt[comparisonProp];
			}
			else{
				bpv=bestPt
			}
			
			d=Math.pow(pt[dim] - bpv[dim],2);
			if(dir==l){
				//check r
				if(d<bestDist){
					//traverse r
					nn(node.r, lvl+1);
				}
			}
			else{
				//check l
				if(d<bestDist){
					//traverse l
					nn(node.l, lvl+1);
				}
			}

		}
	}

	/**
	Returns the distance of two vectors
	*/
	function distSq(a, b){
		var d=0;
		//assumes a and b are the same length
		for(var i=0;i<a.length;i++){
			d+= Math.pow(a[i]-b[i], 2);
		}
		return d;
	}

	function getRoot(){
		return root;
	}

	function getComparisonProp(){
		return comparisonProp;
	}

	return {
		buildKdTree:buildKdTree,
		nearestNeighbor:nearestNeighbor,
		getRoot:getRoot,
		getComparisonProp:getComparisonProp,
		toBinaryHeap:toBinaryHeap
	}
});

IhtaiUtils.mergeSort = function(data, f){
	var l, r, split;
	if(data.length < 2)
		return data;

	split = Math.floor(data.length/2);
	l = data.slice(0,split);
	r = data.slice(split);

	var mergedArr = IhtaiUtils.merge(IhtaiUtils.mergeSort(l, f), IhtaiUtils.mergeSort(r, f), f);
	//mergedArr.unshift(0, data.length);
	//data.splice.apply(data, mergedArr);
	return /*data*/ mergedArr;
}

IhtaiUtils.merge = function(l, r, f){
	var il=0, ir=0, output=[];

	while(il < l.length && ir < r.length){
		if(f(l[il],r[ir]))
			output.push(l[il++]);
		else
			output.push(r[ir++]);
	}

	return output.concat(l.slice(il)).concat(r.slice(ir));
}