/*
TODO:
-add k-means clustering for initial signal inputs
-add data struct that allows for hierarchical queries based on:
	-using the cluster most closely matching input signal,
	-from shortest time series to longest
		-find time series with closest ending signal match to desired drive state. return time series.
	-go up a time series length level
	-if no time series levels are close enough, act on instinct
-add memorize()
-add recall()
-add instinct center (automated physical actions)
-add drive center (algorithms representing internal stimuli)

*/ 

var Ihtai = (function(){

	function memorize(){
		
	}

	function recall(){

	}


	return {
		recall: recall,
		memorize: memorize
	};
})();

//clusters are 'buckets' that input stimuli are placed in
var Clusters = (function(){
	//TODO: implement as k-means clustering
	//TODO: allow number of clusters to be variable

	function init(){

	}

	function add(){

	}

	return {
		init: init,
		add: add
	};
})();

//drives are internal stimuli determined by algorithms that take each other and external stimuli as inputs
var Drives = (function(){

	return {

	};
})();

//instincts are actions triggered when no memory series matches desired drive state closely enough.
var Instincts = (function(){

	return{

	};
})();