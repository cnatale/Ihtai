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

	var numClusters, ioStimuli, memorizer, intervalID;

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

		//intervalID = window.setInterval(cycle, 33); //initiate cycle
	}

	function cycle(){
		//TODO: cycle through memorization, drives, reflexes, and iostimuli in correct order

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
	var height=_height, acceptableRange=1, level, homeostasisGoal;

	function init(){
		//initialize a 2d array representing all possible memories
		level=[];
		for(var i=0; i<height; i++){
			level[i].series={};
			level[i].recordingSeries={};
			level[i].ctr =0; //initialize time sequence counter for each level
		}

		//TODO: set a real homeostasisGoal
		homeostasisGoal=[0,0,0,0,0];
	}
	init();

	/**
		Takes a cluster containing vector representing current i/o stimuli state combined with current 
		drive state.
		@returns a vector representing the moment output stimuli for moment in time 
		most likely to satiate current drives, i.e. the behavior most likely to satiate drives.
	*/
	function query(cluster){
		var outputStimuli, stimDist, sd;

		for(var i=0; i<height; i++){
			//At each level, compare time series' end drive state with homeostasis goal.
			//If result < acceptable range, return time series' starting ouput stimuli (what agent will act on).
			//TODO: define homeostasisGoal
			sd = sqDist(level[i].series[cluster.id].endState, homeostasisGoal);

			//if no match is within acceptable range, go to next level
			if(sd <= acceptableRange){
				outputStimuli = level[i].series[cluster.id].secondState;
				break;
			}
		}


		return outputStimuli;
	}

	function sqDist(v1, v2){
		var d=0;
		for(var i=0; i<v1.length;i++){
			d+=Math.pow(v1[i] - v2[i], 2);
		}

		return d;
	}

	/**
		Memorizes stimuli
	*/
	function memorize(cluster){
		/*
			Loop through each time level. At level i, a memory series is i+2 moments long. 
			The only moments we need to store in the series are the start and end moments, though.
			
			Every level has a counter, that is reset every time a new memory sequence starts. The memory
			sequence counts to i+2	
		*/
		var sd1,sd2;
		stimuli=cluster.stimuli;
		for(var i=0; i<height; i++){

			if(level[i].ctr==0){
				//start tracking new memory series
				level[i].recordingSeries.startState=stimuli;
				level[i].recordingSeries.clusterId=cluster.id; //key series based on startState cluster id
			}
			//TODO: add in signal after first, which is the one that will be returned
			if(level[i].ctr == 1){
				level[i].recordingSeries.secondState=stimuli;
			}
			if(level[i].ctr == i+2){
				level[i].recordingSeries.endState=stimuli;
				/*
				TODO: If series' end state is less different from homeostasis goal than   
				current series stored at this start state, overwrite.
				*/
				sd1 = sqDist(level[i].recordingSeries.endState, homeostasisGoal);
				sd2 = sqDist(level[i].series[level[i].recordingSeries.clusterId].endState, homeostasisGoal);

				if(sd1 < sd2){
					//add memory series to level. Hash based on starting state cluster id.
					level[i].series[level[i].recordingSeries.clusterId]={
						startState: level[i].recordingSeries.startState, 
						secondState: level[i].recordingSeries.secondState,
						endState: level[i].recordingSeries.endState
					};					
				}

				level[i].ctr=0;
			}
			else{
				
				level[i].ctr++;
			}
		}
	}

	return {
		query: query,
		memorize: memorize
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

/**
	Drives are internal stimuli with states determined by algorithms that take each other and external stimuli 
	as inputs. Each drive contains a method which maps io stimuli and other drive states into an output
	drive state.

	@params drives: Array. An array of drive methods.
*/
var Drives = (function(_drives){
	var drives = _drives;
	function init(){

	}
	init();

	function cycle(){
		for(var i=0;i<drives.length;i++){
			//TODO:execute each method in drives once per cycle
			drives[i]();
		}
	}

	return {
		cycle:cycle
	};
});

/**
	Reflexes are actions that can be 'hot-triggered' every cycle. They map certain input stimuli vectors to set output responses,
	Ex: a knee nerve stimulation of sufficient level triggers a kick reflex.

	Reflexes also serve the hidden purpose of seeding the Memorizer with behaviors that it can build on.
*/
var Reflexes = (function(_reflexes){
	var reflexes = _reflexes;
	function init(){

	}	
	init();

	function cycle(){
		for(var i=0; i<reflexes.length;i++){
			reflexes[i]();
		}
	}

	return{
		cycle:cycle
	};
});