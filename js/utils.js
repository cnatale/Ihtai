var IhtaiUtils ={};

IhtaiUtils.KdTree = (function(_data){
	var data=_data;

	function init(){
		//TODO: find median at each level
		//buildKdTree(data, 0);
	}
	init();

	/**
		@param p an array of n-dimensional values
	*/

	function buildKdTree(data, depth){

		/*
		TODO: For each level l, split array of n-dimensional points along median of 
		dimension l % d. Assign median point to node. Recursively perform operation on
		left and right sub-arrays.
		*/

		//each node contains the following properties: left, right, and data
	}

	function sortDataByDimension(data){
		//run mergeSort on each dimension (d*n*log(n) running time)
		var sorted=[];
		for(var i=0; i<data[0].length;i++){
			sorted[i]=IhtaiUtils.mergeSort(data, function(a, b){
				if(a[i] < b[i])
					return true;
				else
					return false;
			});
		}
		return sorted;

	}

	return {
		buildKdTree:buildKdTree,
		sortDataByDimension:sortDataByDimension
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