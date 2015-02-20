var Ihtai = (function(bundle){

	var clusterCount, vectorDim, memoryHeight, driveList, reflexList;
	var clusters, memorizer, drives, reflexes, acceptableRange, _enableReflexes=true, _enableMemories=true;
	var outputStimuli =[]; //the output stimuli buffer;

	if(typeof bundle=="string"){ //load from stringified json instead of default initialization
		var parsedFile=JSON.parse(bundle); 
		//inflate clusterCount, vectorDim, memoryHeight,acceptableRange (all primitives)
		clusterCount= parsedFile.clusterCount;
		vectorDim=parsedFile.vectorDim;
		memoryHeight=parsedFile.memoryHeight;
		acceptableRange=parsedFile.acceptableRange;

		//rebuild kd-tree from binary heap
		var heap=parsedFile.clusterTreeHeap;
		//TODO: BUG: the new kdTree instance isn't a complete kdTree. only has nodes, not methods or props		
		var treeRoot=IhtaiUtils.binaryHeapToKdTreeRoot(heap);

		//inflate clusters
		clusters = new Clusters(clusterCount, vectorDim, treeRoot);

		//inflate reflexes
		//inflate indiv reflex functions back from strings by eval'ing them
		var deflatedReflexes=parsedFile.reflexes,inflatedReflexes=[],r;

		for(var i=0;i<deflatedReflexes.length;i++){
			//convert functions to strings for storage
			r={
				matcher:eval(deflatedReflexes[i].matcher),
				response:eval(deflatedReflexes[i].response)
			}
			inflatedReflexes[i]=r; //convert function to string for storage
		}
		reflexes = new Reflexes(inflatedReflexes);
	
		//inflate drives
		//inflate indiv drive functions back from strings by eval'ing them
		var deflatedDrives=parsedFile.drives,inflatedDrives=[],d;
		for(var i=0;i<deflatedDrives.length;i++){
			//convert functions to strings for storage
			d={
				init:eval(deflatedDrives[i].init),
				cycle:eval(deflatedDrives[i].cycle),
				targetValue:deflatedDrives[i].targetValue
			};
			inflatedDrives[i]=d;
		}
		drives = new Drives(inflatedDrives);

		//inflate memorizer	
		var buffer=parsedFile.memorizer.buffer;
		var levels=parsedFile.memorizer.levels;
		memorizer = new Memorizer(memoryHeight, drives.getGoals(), acceptableRange, buffer, levels);

	}
	else{
		function init(bundle){
			if(typeof bundle == "undefined")
				throw "Error: no initialization object!"
			if(typeof bundle != "object")
				throw "Error: initialization parameter should be an Object or String!"

			if(bundle.clusterCount)
				clusterCount= bundle.clusterCount;
			else
				throw "Error: no 'clusterCount' property found in initialization Object!"
			if(bundle.vectorDim)
				vectorDim=bundle.vectorDim;
			else
				throw "Error: no 'vectorDim' property found in initialization Object!"		
			if(bundle.memoryHeight)
				memoryHeight=bundle.memoryHeight;
			else
				throw "Error: no 'memoryHeight' property found in initialization Object!"
			if(bundle.drivesList)
				driveList=bundle.drivesList;
			else
				throw "Error: no 'drives' property found in initialization Object!"
			if(bundle.reflexList)
				reflexList=bundle.reflexList;
			else
				throw "Error: no 'reflexes' property found in initialization Object!"
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
	}

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
	function saveFile(fileName, suppressOutput){
		var deflated={};

		//store all information necessary to rebuild as json

		//save clusterTree
		var tree= clusters.getClusterTree();		
		var heap=tree.toBinaryHeap();
		deflated.clusterTreeHeap=heap;

		//save clusterCount, vectorDim, memoryHeight,acceptableRange (all primitives)
		deflated.clusterCount=clusterCount;
		deflated.vectorDim=vectorDim;
		deflated.memoryHeight=memoryHeight;
		deflated.acceptableRange=acceptableRange;

		//save drives
		var driveFns=drives.getDrives(),deflatedDrives=[],d;
		for(var i=0;i<driveFns.length;i++){
			//convert functions to strings for storage
			var init='('+String(driveFns[i].init)+')'.escapeSpecialChars();
			var cycle='('+String(driveFns[i].cycle)+')'.escapeSpecialChars();
			d={
				init:init,
				cycle:cycle,
				targetValue:driveFns[i].targetValue
			};
			deflatedDrives[i]=d;
		}
		deflated.drives=deflatedDrives;

		//save reflexes
		var reflexFns=reflexes.getReflexes(),deflatedReflexes=[],r;
		for(var i=0;i<reflexFns.length;i++){
			//convert functions to strings for storage
			var matcher='('+String(reflexFns[i].matcher)+')'.escapeSpecialChars();
			var response='('+String(reflexFns[i].response)+')'.escapeSpecialChars();
			r={
				matcher:matcher,
				response:response
			}
			deflatedReflexes[i]=r; //convert function to string for storage
		}
		deflated.reflexes=deflatedReflexes;


		//save Memorizer
		deflated.memorizer={
			buffer:memorizer.getBuffer(),
			levels:memorizer.getLevels()
		};

		var stringifiedAndDeflated=JSON.stringify(deflated);
	
		/*
		TODO:local file save still doesn't work for files larger than ~10,000 memories.
		Try chunking output and saving in pieces.
		*/
		if(typeof suppressOutput == "undefined" || suppressOutput==false){
			//Physically save a copy to user's hard drive
			var link = document.createElement('a');
			link.setAttribute('href', 'data:text/plain;charset=UTF-8,'+stringifiedAndDeflated);
			link.setAttribute('download', fileName+'.json');
			document.getElementsByTagName("body")[0].appendChild(link).click();		
		}

		return stringifiedAndDeflated;
	}

	function getProperties(){
		return {
			clusterCount:clusterCount, 
			vectorDim:vectorDim,
			memorizer:memorizer, 
			memoryHeight:memoryHeight, 
			driveList:driveList,
			reflexList:reflexList,
			
			clusters:clusters, 
			drives:drives, 
			reflexes:reflexes, 
			acceptableRange:acceptableRange,
			_enableReflexes:_enableReflexes, 
			_enableMemories:_enableMemories
		};
	}
	return {
		cycle:cycle,
		enableReflexes:enableReflexes,
		areReflexesEnabled:areReflexesEnabled,
		enableMemories:enableMemories,
		areMemoriesEnabled:areMemoriesEnabled,
		saveFile:saveFile,
		getProperties:getProperties
	};
});

/**
	The cerebral cortex of the a.i. Hierarchically, temporally memorizes
	moments in time represented by vectors combining stimuli and drive states.
*/
var Memorizer = (function(_height, _homeostasisGoal, _acceptableRange, _buffer, _levels){
	var height=_height, acceptableRange/*the square distance that matches must be less than*/;
	var level, buffer, homeostasisGoal;

	if(_acceptableRange)
		acceptableRange=_acceptableRange;
	else
		acceptableRange=75;

	function init(){

		if(typeof _buffer != "undefined" && typeof _levels != "undefined"){
			//rebuild from existing buffer and level data
			buffer=_buffer;
			level=_levels;
		}
		else{
			//initialize an array of hashmaps representing all possible memories
			level=[], buffer=[];
			for(var i=0; i<height; i++){
				level[i]={};
				level[i].series={};
			}
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

		TODO:think about adding the previous cycle's drive vectors to io signal
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
					If same first and second states are the same, store the memory
					as weighted average of the two (same firstState and secondState, endState drive values become
					weighted average)

					This handles the case where a previously optimal memory leads to a less optimal outcome, which 
					should raise its cost for future queries. Also if a marginally optimal outcome becomes more optimal,
					increase fitness. It also simulates how behavior "hardens" as it is carried out more and more often.

					The averaging step is weighted in favor of the existing drive endstate,
					based on how many secondState collisions have occurred. The more collisions, the more the
					averaging step is weighted towards the existing drive endState. This requires storing an 
					extra number holding the secondState collision count, reset every time new secondState and endState
					is selected (as opposed to non-weighted average).
					*/		
					if(sqDist(buffer[secondState].stimuli, level[i].series[buffer[startState].id].secondState) === 0){
						var bufferGoalDist = buffer[endState].stimuli.slice(-homeostasisGoal.length);
						var endStateGoalDist = level[i].series[buffer[startState].id].endState.slice(-homeostasisGoal.length);
						level[i].series[buffer[startState].id].collisions++;
						for(var j=0;j<bufferGoalDist.length;j++){
							//todo:rework with new collisions property
							var collisions=level[i].series[buffer[startState].id].collisions;
							endStateGoalDist[j]= ((endStateGoalDist[j]*collisions)+bufferGoalDist[j])/(collisions+1);
				
							//the old non-weighted collision logic
							//endStateGoalDist[j]= (endStateGoalDist[j]+bufferGoalDist[j])/2;
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
								endState: buffer[endState].stimuli,
								collisions:0
							};
						}	
					}		
				}
				else{
					
					//no pre-existing memory using this key. add memory series to level. Hash based on starting state cluster id.
					level[i].series[buffer[startState].id]={
						startState: buffer[startState].stimuli, 
						secondState: buffer[secondState].stimuli,
						endState: buffer[endState].stimuli,
						collisions:0
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
	function getBuffer(){
		return buffer;
	}

	function getGoals(){
		return homeostasisGoal;
	}

	return {
		query: query,
		memorize: memorize,
		getHeight: getHeight,
		getLevels: getLevels,
		getBuffer: getBuffer
	}
});

//clusters are 'buckets' that n-dimensional stimuli moments are placed inside
//_kdTree is an optional param
var Clusters = (function(_numClusters, _vectorDim, _kdTree){
	var vectorDim=_vectorDim, clusterTree;
	var numClusters = _numClusters	
	/**
		Individual clusters have the following properties:
		id: a unique id
		stimuli: a vector representing stimuli
	*/

	/**
		-randomly assign k clusters over n-dimensional vector space
		@param {number} k
	*/
	function init(_kdTree){	
		/*
		TODO: think about distributing points using a low-discrepancy sequence instead of randomly
		(http://stackoverflow.com/questions/10644154/uniform-distribution-of-points)
		It seems like there are significant gaps in mapping space even with cluster values of 100,000 with
		pseudo-random uniform distribution.
		*/

		if(typeof _kdTree == "undefined"){
			var clusters=[];
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
		else{
			clusterTree=new IhtaiUtils.KdTree(_kdTree, "stimuli", true);
		}
	}
	init(_kdTree);

	/** 
		-find nearest cluster to v
		-calculate distance between v and nearest cluster
		-move cluster v a small amount closer to v's position

		@returns {Object} the nearest cluster to v
	*/
	function findNearestCluster(v){
		var nearestCluster;
		var leastSq, t;
		nearestCluster = clusterTree.nearestNeighbor(v);

		return nearestCluster;
	}

	function getClusterTree(){
		return clusterTree;
	}

	return {
		findNearestCluster: findNearestCluster,
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

	function getReflexes(){
		return reflexes;
	}

	return{
		cycle:cycle,
		getReflexes:getReflexes
	};
});