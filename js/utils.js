var IhtaiUtils ={};

IhtaiUtils.KdTree = (function(_data){
	var data=_data;
	var root;

	function init(){
		//TODO: find median at each level
		root = buildKdTree(data);
	}
	init();

	/**
		@param p an array of n-dimensional values
	*/

	function buildKdTree(data){
		/*
		TODO: For each level l, split array of n-dimensional points along median of 
		dimension l % d. Assign median point to node. Recursively perform operation on
		left and right sub-arrays.
		*/

		//each node contains the following properties: left, right, and data		

		var root=createNode(data,0); //this will build the entire kd-tree, with reference to root
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
				dimensionality=data[0].length;
				dim = lvl % dimensionality;

				//sort array by current dimension
				var sortedData=IhtaiUtils.mergeSort(data, function(a, b){
					if(a[dim] < b[dim])
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

	function getRoot(){
		return root;
	}

	return {
		buildKdTree:buildKdTree,
		getRoot:getRoot
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