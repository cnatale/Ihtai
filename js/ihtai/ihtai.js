var Ihtai = (function(bundle){

	var clusterCount, vectorDim, memorizer, memoryHeight, driveList, reflexList, intervalID;
	var clusters, memorizer, drives, reflexes, acceptableRange, _enableReflexes=true, _enableMemories=true;
	var outputStimuli =[]; //the output stimuli buffer;

	function init(bundle){
		if(typeof bundle == "undefined")
			throw "Error: no initialization object!"
		if(typeof bundle != "object")
			throw "Error: initialization parameter should be an object!"

		if(bundle.clusterCount)
			clusterCount= bundle.clusterCount;
		else
			throw "Error: no 'clusterCount' property found in initialization object!"
		if(bundle.vectorDim)
			vectorDim=bundle.vectorDim;
		else
			throw "Error: no 'vectorDim' property found in initialization object!"		
		if(bundle.memoryHeight)
			memoryHeight=bundle.memoryHeight;
		else
			throw "Error: no 'memoryHeight' property found in initialization object!"
		if(bundle.drivesList)
			driveList=bundle.drivesList;
		else
			throw "Error: no 'drives' property found in initialization object!"
		if(bundle.reflexList)
			reflexList=bundle.reflexList;
		else
			throw "Error: no 'reflexes' property found in initialization object!"
		if(bundle.acceptableRange)
			acceptableRange=bundle.acceptableRange;
		else
			acceptableRange=null;

		clusters = new Clusters(clusterCount, vectorDim);
		reflexes = new Reflexes(reflexList);
		drives = new Drives(driveList);
		memorizer = new Memorizer(memoryHeight, drives.getGoals(), acceptableRange);
	}
	init(bundle);

	function cycle(ioStimuli){
		var combinedStimuli, curCluster;

		//cycle drives
		var drivesOutput=drives.cycle(ioStimuli);

		//merge ioStimuli and drives output
		combinedStimuli = ioStimuli.concat(drivesOutput);

		//get nearest cluster for combined stimuli
		curCluster= clusters.findNearestCluster(combinedStimuli);

		//cycle reflexes
		var reflexOutput;
		if(_enableReflexes){
			reflexOutput=reflexes.cycle(curCluster);
		}
		else{
			reflexOutput=[];
		}

		//cycle memorizer
		var memorizerOutput;		
		if(_enableMemories){
			memorizerOutput=memorizer.query(curCluster);
		}
		else{
			memorizerOutput=null;
		}
		memorizer.memorize(curCluster);
	
		//send reflex output and memorizer output back to ai agent
		return {
			reflexOutput:reflexOutput,
			memorizerOutput:memorizerOutput,
			drivesOutput:drivesOutput
		};
	}

	function enableReflexes(state){
		_enableReflexes=state;
	}
	function areReflexesEnabled(){
		return _enableReflexes;
	}
	function enableMemories(state){
		_enableMemories=state;
	}
	function areMemoriesEnabled(){
		return _enableMemories;
	}
	function save(){
		var deflated;

		/*TODO:store all information necessary to rebuild as json
		*/
		var tree= clusters.getClusterTree();
		//save tree as an array by in-order traversing and outputing results into array
		//TODO:implement using a toJSON property attached to tree, and calling json.stringify() on tree.
		//TODO:implement fromJSON to unpack

		//save clusterCount, vectorDim, memoryHeight,acceptableRange (all primitives)
		deflated.clusterCount=clusterCount;
		deflated.vectorDim=vectorDim;
		deflated.memoryHeight=memoryHeight;
		deflated.acceptableRange=acceptableRange;

		//save drives
		//TODO:implement using a toJSON property attached to drives obj
		//TODO:implement fromJSON to unpack

		//save reflexes
		//TODO:implement using a toJSON property attached to reflexes obj 
		//TODO:implement fromJSON to unpack

		//open the deflated data in a new window as text so the user can save
		var url = 'data:text/json;charset=utf8,' + encodeURIComponent(deflated);
		window.open(url, '_blank');
		window.focus();

		return deflated;
	}
	return {
		cycle:cycle,
		enableReflexes:enableReflexes,
		areReflexesEnabled:areReflexesEnabled,
		enableMemories:enableMemories,
		areMemoriesEnabled:areMemoriesEnabled
	};
});

/**
	The cerebral cortex of the a.i. Hierarchically, temporally memorizes
	moments in time represented by vectors combining stimuli and drive states.
*/
var Memorizer = (function(_height, _homeostasisGoal, _acceptableRange){
	var height=_height, acceptableRange/*the square distance that matches must be less than*/;
	var level, buffer, homeostasisGoal;

	if(_acceptableRange)
		acceptableRange=_acceptableRange;
	else
		acceptableRange=75;

	function init(){
		//initialize a 2d array representing all possible memories
		level=[], buffer=[];
		for(var i=0; i<height; i++){
			level[i]={};
			level[i].series={};
		}

		/*The default homeostasis goal value is for test purposes only. The _homeostasisGoal 
		parameter should always be included when initializing Meorizer.*/
		if(typeof _homeostasisGoal !== "undefined")
			homeostasisGoal = _homeostasisGoal;
		else
			homeostasisGoal=[0,0,0,0,0]; //default for test purposes
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

		/*TODO:this query could be improved to log(h) if the data was sorted according to dist from
		homeostasis goal * some multiplier for height value (to disincentivize longer-term solutions)
		*/
		for(var i=0; i<height; i++){
			//At each level, compare time series' end drive state with homeostasis goal.
			//If result < acceptable range, return time series' starting ouput stimuli (what agent will act on).
			
			//TODO: the sqDist should be applied only to homeostasis goal values, not entire array
			if(level[i].series.hasOwnProperty(cluster.id)){
				sd = sqDist(level[i].series[cluster.id].endState.slice(-homeostasisGoal.length), homeostasisGoal);
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

			Each vector is a reference to to a cluster's stimuli array, making this an efficient way
			to re-use the existing memory allocations (only need to store a pointer instead of the raw
			vector data).
		*/
		var sd1,sd2,size, startState, secondState, endState;
		stimuli=cluster.stimuli;

		//update the buffer
		buffer.push(cluster);
		if(buffer.length>height)
			buffer.shift(); //this may be an O(n) implementation. Think about changing.

		for(var i=0; i<height; i++){
			size=i+3;
			startState=buffer.length-size;
			secondState=buffer.length-size+1;
			endState=buffer.length-1;

			//Once we have a buffer full enough for this level, add a memory every cycle
			if(buffer.length>=size){
				
				/*
				If series' end state is less different from homeostasis goal than   
				current series stored at this start state, overwrite. If no current series is stored
				at this start state, store it regardless.
				*/				
				if(level[i].series.hasOwnProperty(buffer[startState].id)){
					/*
					If same first and second state lead to a different end drive state, store the memory
					as weighted average of the two (same firstState and secondState, endState drive values become
					weighted average. Actually, can probably get rid of endState iostimuli as it's not being
					used anywhere.)

					This handles the case where a previously optimal memory leads to a less optimal outcome, which 
					should raise its cost for future queries.

					TODO: the averaging step should really be weighted in favor of the existing drive endstate,
					based on how many secondState collisions have occurred. The more collisions, the more the
					averaging step is weighted towards the existing drive endState. This requires storing an 
					extra number holding the secondState collision count, reset every time new secondState and endState
					is selected (as opposed to merging).
					*/		
					if(sqDist(buffer[secondState].stimuli, level[i].series[buffer[startState].id].secondState) === 0){
						var bufferGoalDist = buffer[endState].stimuli.slice(-homeostasisGoal.length);
						var endStateGoalDist = level[i].series[buffer[startState].id].endState.slice(-homeostasisGoal.length);
						for(var j=0;j<bufferGoalDist.length;j++){
							endStateGoalDist[j]= (endStateGoalDist[j]+bufferGoalDist[j])/2;
						}
						var args = [-homeostasisGoal.length, homeostasisGoal.length].concat(endStateGoalDist);
						Array.prototype.splice.apply(level[i].series[buffer[startState].id].endState, args);		
					}
					else{ 
						//secondStates are different. Figure out which one leads to better outcome.
						sd1 = sqDist(buffer[endState].stimuli.slice(-homeostasisGoal.length), homeostasisGoal);
						sd2 = sqDist(level[i].series[buffer[startState].id].endState.slice(-homeostasisGoal.length), homeostasisGoal);

						if(sd1 < sd2){
							//add memory series to level. Hash based on starting state cluster id.
							level[i].series[buffer[startState].id]={
								startState: buffer[startState].stimuli, 
								secondState: buffer[secondState].stimuli,
								endState: buffer[endState].stimuli
							};
						}	
					}		
				}
				else{
					
					//no pre-existing memory using this key. add memory series to level. Hash based on starting state cluster id.
					level[i].series[buffer[startState].id]={
						startState: buffer[startState].stimuli, 
						secondState: buffer[secondState].stimuli,
						endState: buffer[endState].stimuli
					};					
				}
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

	function getGoals(){
		return homeostasisGoal;
	}

	return {
		query: query,
		memorize: memorize,
		getHeight: getHeight,
		getLevels: getLevels
	}
});

//clusters are 'buckets' that n-dimensional stimuli moments are placed inside
var Clusters = (function(_numClusters, _vectorDim){
	//TODO: think about sorting data for better search performance. research k-d trees, n-dimensional nearest neighbor solutions.
	/**
		Individual clusters have the following properties:
		id: a unique id
		stimuli: a vector representing stimuli
	*/

	var clusters=[], vectorDim=_vectorDim, clusterTree;
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

		//populate kd-tree
		clusterTree= new IhtaiUtils.KdTree(clusters, "stimuli");
	}
	init();

	/** 
		-find nearest cluster to v
		-calculate distance between v and nearest cluster
		-move cluster v a small amount closer to v's position

		@returns {Object} the nearest cluster to v
	*/
	function findNearestCluster(v){
		//TODO: replace with kd-tree
		var nearestCluster, clusters=getClusters();
		var leastSq, t;



		/*for(var i=0; i < clusters.length; i++){
			t=0;
			for(var j=0; j< v.length; j++){
				t+= Math.pow(v[j] - clusters[i].stimuli[j], 2);
			}

			if(i==0 || t < leastSq){
				leastSq=t;
				nearestCluster=clusters[i];
			}			
		}*/
		nearestCluster = clusterTree.nearestNeighbor(v);


		return nearestCluster;
	}

	function getClusters(){
		return clusters;
	}
	function getClusterTree(){
		return clusterTree;
	}

	return {
		findNearestCluster: findNearestCluster,
		getClusters: getClusters,
		getClusterTree: getClusterTree
	};
});

/**
	Drives are internal stimuli with states determined by algorithms that take each other and external stimuli 
	as inputs. Each drive contains a method which maps io stimuli and other drive states into an output
	drive state.

	@params drives: Array. An array of drive methods. Each drive takes form {init:function, cycle:function}
*/
var Drives = (function(_drives){
	var drives = _drives;
	function init(){
		for(var i=0;i<drives.length;i++){
			drives[i].init();
		}
	}
	init();

	function cycle(ioStim){
		var response=[];
		for(var i=0;i<drives.length;i++){
			//execute each method in drives once per cycle
			response.push(drives[i].cycle(ioStim)); //expects each drives method to return a Number 0-100
		}
		return response;
	}

	function getDrives(){
		return drives;
	}

	function getGoals(){
		var goals=[];
		for(var i=0;i<drives.length;i++){
			goals.push(drives[i].targetValue);
		}
		return goals;
	}

	return {
		cycle:cycle,
		getDrives:getDrives,
		getGoals:getGoals
	};
});

/**
	Reflexes are actions that can be 'hot-triggered' every cycle. They map certain input stimuli vectors to set output responses,
	Ex: a knee nerve stimulation of sufficient level triggers a kick reflex.

	Reflexes also serve the purpose of seeding the Memorizer with behaviors that it can build on.
*/
var Reflexes = (function(_reflexes){
	/*
	each reflex is an object that contains:
	matcher: vector indices to match against, in the form of {indices:[], signal:[]}
	response: the reflex response, in the form of {indices:[], signal:[]}. The responseLevels part is a vector
	of the dimensions described by the indices part. So a match containing only the second index would return
	a 1-d vector signal, which would be sent as an output stimuli to the second index.
	*/
	var reflexes = _reflexes;
	function init(){
	}	
	init();

	function cycle(cluster){
		var output=[], matcher, response, indices, stimuli=cluster.stimuli, ctr;
		//cluster has properties: id, stimuli
		for(var i=0; i<reflexes.length;i++){
			//TODO:rewrite to compare with a matcher fn that takes stimuli as a parameter
			matcher=reflexes[i].matcher;
			if(matcher(stimuli))
				output.push(reflexes[i].response(stimuli));
		}

		return output;
	}

	return{
		cycle:cycle
	};
});