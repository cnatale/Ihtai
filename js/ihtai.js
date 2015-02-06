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
			level[i]={};
			level[i].series={};
			level[i].recordingSeries={};
			level[i].ctr =0; //initialize time sequence counter for each level
		}

		//TODO: set a real homeostasisGoal, which requires mapping this to correct number of dimensions
		//TODO: should be pulled from drives portion of app
		homeostasisGoal=[0,0,0,0,0];
	}
	init();

	/**
		Takes a cluster containing vector representing current i/o stimuli state combined with current 
		drive state.
		@returns A vector representing the next action agent should take to minimize homeostasis differential.
		If no vector is within acceptable range, return null.
	*/
	function query(cluster){
		var outputStimuli=null, stimDist, sd;

		for(var i=0; i<height; i++){
			//At each level, compare time series' end drive state with homeostasis goal.
			//If result < acceptable range, return time series' starting ouput stimuli (what agent will act on).
			//TODO: define homeostasisGoal
			if(level[i].series.hasOwnProperty(cluster.id)){
				sd = sqDist(level[i].series[cluster.id].endState, homeostasisGoal);
				if(sd <= acceptableRange){
					outputStimuli = level[i].series[cluster.id].secondState;
					break;
				}
			}
			//if no match is within acceptable range, go to next level
		}

		return outputStimuli;
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

			if(level[i].ctr == 0){
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
				If series' end state is less different from homeostasis goal than   
				current series stored at this start state, overwrite. If no current series is stored
				at this start state, store it.
				*/
				if(level[i].series.hasOwnProperty(level[i].recordingSeries.clusterId)){
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
				}
				else{
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

	function sqDist(v1, v2){
		var d=0;
		for(var i=0; i<v1.length;i++){
			d+=Math.pow(v1[i] - v2[i], 2);
		}

		return d;
	}

	function getHeight(){
		return height;
	}

	function getLevels(){
		return level;
	}

	return {
		query: query,
		memorize: memorize,
		getHeight: getHeight,
		getLevels: getLevels
	}
});

//clusters are 'buckets' that input stimuli are placed inside
var Clusters = (function(_numClusters, _vectorDim){
	//TODO: think about sorting data for better search performance. research k-d trees, n-dimensional nearest neighbor solutions.
	/**
		Individual clusters have the following properties:
		id: a unique id
		stimuli: a vector representing stimuli
	*/

	var clusters=[], vectorDim=_vectorDim;
	var numClusters = _numClusters

	/**
		-TODO:randomly assign k clusters over n-dimensional vector space
		@param {number} k
	*/
	function init(){
		//create clusters with id(needs to be unique) and stimuli properties
		for(var i=0;i<numClusters;i++){
			clusters[i]={id:i, stimuli:[]};
			//map clusters to random points in n-dimensional space 
			for(var j=0;j<vectorDim;j++){
				//assumes vectors are normalized to a 0-100 scale
				if(i==0){ //test cluster
					clusters[i].stimuli[j]=50;
				}
				else{
					clusters[i].stimuli[j]=Math.random()*100;
				}
				
			}
		}
	}
	init();

	/** 
		-find nearest cluster to v
		-calculate distance between v and nearest cluster
		-move cluster v a small amount closer to v's position

		@returns {Object} the nearest cluster to v
	*/
	function findNearestCluster(v){
		var nearestCluster, clusters=getClusters();
		var leastSq, t;
		for(var i=0; i < clusters.length; i++){
			t=0;
			for(var j=0; j< v.length; j++){
				t+= Math.pow(v[j] - clusters[i].stimuli[j], 2);
			}

			if(i==0 || t < leastSq){
				leastSq=t;
				nearestCluster=clusters[i];
			}			
		}

		//move nearest cluster a bit closer to v
		for(i=0; i< nearestCluster.length; i++){
			//nearestCluster[i] += v[i]*.01; turn this off for now. doesn't play well with k-d tree balancing
		}

		return nearestCluster;
	}

	function getClusters(){
		return clusters;
	}

	return {
		findNearestCluster: findNearestCluster,
		getClusters: getClusters
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