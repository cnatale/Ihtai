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

	return table[Math.floor(Math.random() * table.length)];
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

Each element in the heap param contains a kd-tree's .value property
*/
IhtaiUtils.binaryHeapToKdTreeRoot = (function(heap){
	var root,node, parent;
	for(var i=0;i<heap.length;i++){
		if(heap[i]!=null){
			node={
				value:heap[i]
			}
			heap[i]=node; //replace value with inflated object

			if(i==0)
				root=node;
			else{
				parent=heap[Math.floor((i-1)/2)];
				if(!parent.hasOwnProperty('left'))
					parent.left=node;
				else
					parent.right=node;
			}			
		}
	}

	return root;
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
				queue.enqueue(node.left);
				queue.enqueue(node.right);
				output.push(node.value);
			}
			else
				output.push(node);
		}
		return output;
	}

	/**
		@param data: an array of n-dimensional values
	*/
	function buildKdTree(data){
		/*
		For each level l, split array of n-dimensional points along median of 
		dimension l % d. Assign median point to node. Recursively perform operation on
		left and right sub-arrays.
		*/

		//each node contains the following properties: left, right, and value		

		//TODO: this net line is the entirety of poor load performance
		var root=createNode(data,0); //this will recursively build the entire kd-tree, with reference to root
		return root;

		function createNode(data, lvl){
			var node;

			if(data.length<2){
				//base case. don't do any more splitting. 
				//create node, return node. stop recursion.
				node={
					value:data[0],
					left:null,
					right:null
				}
				return node;
			}
			else{
				var median, medianIndex, dimensionality, dim, left, right;
				dimensionality=data[0].length; //assumes all elements are of same dimension
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

				//this prevents median and left from referencing same point if length=2 
				if(sortedData.length==2){
					node = {
						value:sortedData[1],
						left:createNode([sortedData[0]], lvl+1),
						right:null
					}
				}
				else{
					medianIndex=Math.floor(sortedData.length/2);
					median=sortedData[medianIndex];
					left=sortedData.slice(0,medianIndex);
					right=sortedData.slice(medianIndex+1);

					//create node.
					node = {
						value:median,
						left:createNode(left, lvl+1),
						right:createNode(right, lvl+1)
					}					
				}

				return node;
			}
		}
	}

	/**
	Perform nearest neighbor search on kd-tree.
	@param v the vector to use when performing nearest neighbor search
	nodes have properties left, right, and value
	*/
	function nearestNeighbor(pt){
		var bestPt, bestDist=Infinity;
	
		nn(root, 0);
		//cache=[];
		return bestPt;

		function nn(node, lvl){
			var left=1, right=-1, dir;
			var dim=lvl % pt.length;

			if(node==null)
				return;

			var nv;
			if(typeof comparisonProp==="function"){
				if(!cache[node.value.id])
					cache[node.value.id]=comparisonProp.call(node.value);
				nv=cache[node.value.id];	
			}
			else if(typeof comparisonProp=="string"){
				nv=node.value[comparisonProp]
			}
			else{
				nv=node.value;
			}

			if(pt[dim] < nv[dim]){
				//descend left
				nn(node.left, lvl+1);
				dir=left;
			}
			else{
				//descend right
				nn(node.right, lvl+1);
				dir=right;
			}

			//check if current node is closer than current best
			var d=distSq(nv, pt);
			if(d<bestDist){
				bestDist=d;
				bestPt=node.value;
			}

			/*
			Whichever way we went, check other child node to see if it could be closer.
			If so, descend.
			*/
			var bpv;
			if(typeof comparisonProp==="function"){
				if(!cache[bestPt.id])
					cache[bestPt.id]=comparisonProp.call(bestPt);
				var bpv=cache[bestPt.id];
			}
			else if(typeof comparisonProp=="string"){
				bpv=bestPt[comparisonProp];
			}
			else{
				bpv=bestPt
			}
			
			d=Math.pow(pt[dim] - bpv[dim],2);
			if(dir==left){
				//check right
				if(d<bestDist){
					//traverse right
					nn(node.right, lvl+1);
				}
			}
			else{
				//check left
				if(d<bestDist){
					//traverse left
					nn(node.left, lvl+1);
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
	var left, right, split;
	if(data.length < 2)
		return data;

	split = Math.floor(data.length/2);
	left = data.slice(0,split);
	right = data.slice(split);

	var mergedArr = IhtaiUtils.merge(IhtaiUtils.mergeSort(left, f), IhtaiUtils.mergeSort(right, f), f);
	//mergedArr.unshift(0, data.length);
	//data.splice.apply(data, mergedArr);
	return /*data*/ mergedArr;
}

IhtaiUtils.merge = function(left, right, f){
	var il=0, ir=0, output=[];

	while(il < left.length && ir < right.length){
		if(f(left[il],right[ir]))
			output.push(left[il++]);
		else
			output.push(right[ir++]);
	}

	return output.concat(left.slice(il)).concat(right.slice(ir));
}