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

	var numClusters, ioStimuli, memorizer;

	function init(bundle){
		if(typeof bundle == "undefined")
			throw "Error: no initialization object!"
		if(typeof bundle != "object")
			throw "Error: initialization parameter should be an object!"

		if(bundle.ioStimuli){
			//should be an array of stimuli types
			if(bundle.ioStimuli.constructor === Array ){
				ioStimuli = bundle.ioStimuli;
				//todo: init io stimuli
			}
			else
				throw "Error: 'ioStimuli' property should be an array!"

		}
		else
			throw "Error: no 'ioStimuli' property found in initialization object!"

		if(bundle.clusters){
			numClusters= bundle.numClusters;
			
		}	
		else
			throw "Error: no 'clusters' property found in initialization object!"

		if(bundle.memoryHeight){
			//todo:build memorizer
			memorizer = new memorizer(bundle.memoryHeight);
		}
		else
			throw "Error: no 'memoryHeight' property found in initialization object!"


		console.log('init clusters: '+ k);
	}



	return {
		init: init
	};
});

/**
	The cerebral cortex of the a.i. Hierarchically, temporally memorizes
	moments in time represented by vectors combining stimuli and drive states.
*/
var Memorizer = (function(_height){

	var height=_height, acceptableRange=1 level;

	function init(){
		//initialize a 2d array representing all possible memories
		level=[];
		for(var i=0; i<height; i++){
			level[i]=[];
		}
	}
	init();

	/**
		Takes a vector representing current i/o stimuli state combined with current drive state
		@returns a vector representing the moment output stimuli for moment in time 
		most likely to satiate current drives, i.e. the behavior most likely to satiate drives.
	*/
	function cycle(currStimuli){
		var outputStimuli, stimDist, sd;

		for(var i=0; i<height; i++){
			//TODO: go through a level, finding closest match to stimuli
			//TODO: initial implementation can be O(n), but implement as a sorted
			// O(log(n)) match for performance.
			for(var j=0; j< level[i].length; j++){
				//TODO: this isn't right
				sd=sqDist(level[i][j], currStimuli);
				if(sd<outputStimuli)
					outputStimuli=sd;
			}


			//TODO: if no match is within acceptable range, go to next level
			if(stimDist <= acceptableRange)
				break;
		}



		return outputStimuli;
	}

	return {
		cycle: cycle
	}
});

//clusters are 'buckets' that input stimuli are placed in
var Clusters = (function(_numClusters){
	//TODO: implement as k-means clustering
	//TODO: allow number of clusters to be variable
	//TODO: think about sorting data for better search performance. research k-d trees, n-dimensional nearest neighbor solutions.

	var numClusters = _numClusters

	/**
		-randomly assign k clusters over n-dimensional vector space
		@param {number} k
	*/
	function init(){}

	/** 
		-find nearest cluster to v
		-calculate distance between v and nearest cluster
		-move cluster v a small amount closer to v's position

		@returns {Object} the nearest cluster to v
	*/
	function insertVector(v){
		var nearestCluster, clusters=getClusters();
		var leastSq, t;
		for(var i=0; i < clusters.length; i++){
			t=0;
			for(var j=0; j< v.length; j++){
				t+= v[j]*v[j] - clusters[i][j]*clusters[i][j];
			}

			if(i==0 || t < leastSq){
				leastSq=t;
				nearestCluster=clusters[i];
			}			
		}

		//move nearest cluster a bit closer to v
		for(i=0; i< nearestCluster.length; i++){
			nearestCluster[i] += v[i]*.01;
		}

		return nearestCluster;
	}

	function getClusters(){
		//TODO: return clusters
	}

	return {
		init: init, 
		insertVector: insertVector
	};
});

/**
	integrates the entirety of input and output stimuli into a vector for
	coordination with motor function and memory
*/
var IoStimuli = (function(){

	/**
	
		@returns a vector representing the current io state
	*/
	function getCurrentStimuli(){


		return currentStimuli;
	}

	return {

	};
});

//drives are internal stimuli determined by algorithms that take each other and external stimuli as inputs
var Drives = (function(){

	return {

	};
});

//instincts are actions triggered when no memory series matches desired drive state closely enough.
var Reflexes = (function(){

	return{

	};
});