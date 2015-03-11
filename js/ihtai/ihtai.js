var Ihtai = (function(bundle){

	var clusterCount, vectorDim, memoryHeight, driveList, reflexList;
	var clusters, memorizer, drives, reflexes, acceptableRange, _enableReflexes=true, _enableMemories=true;
	var bStmCt=0, prevstm=[];
	var outputstm =[]; //the output stm buffer;

	if(typeof bundle=="string"){ //load from stringified json instead of default initialization
		var parsedFile=JSON.parse(bundle); 
		//inflate clusterCount, vectorDim, memoryHeight,acceptableRange (all primitives)
		clusterCount= parsedFile.clusterCount;
		vectorDim=parsedFile.vectorDim;
		memoryHeight=parsedFile.memoryHeight;
		bStmCt=parsedFile.bStmCt;
		acceptableRange=parsedFile.acceptableRange;

		//rebuild kd-tree from binary heap
		var heap=parsedFile.clusterTreeHeap;
		var treeRoot=IhtaiUtils.binaryHeapToKdTreeRoot(heap);

		//inflate clusters
		clusters = new Clusters(clusterCount, vectorDim, bStmCt, treeRoot);

		//inflate reflexes
		//inflate indiv reflex functions back from strings by eval'ing them
		var deflatedReflexes=parsedFile.reflexes,inflatedReflexes=[],r;

		for(var i=0;i<deflatedReflexes.length;i++){
			//convert functions to strings for storage
			r={
				init:eval(deflatedReflexes[i].init),
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
				targetval:deflatedDrives[i].targetval
			};
			inflatedDrives[i]=d;
		}
		drives = new Drives(inflatedDrives);
		drives.setAvgDriveval(parsedFile.avgDriveval);
		drives.setAvgDriveCtr(parsedFile.avgDriveCtr);

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
			if(bundle.bStmCt)
				bStmCt=bundle.bStmCt;

			clusters = new Clusters(clusterCount, vectorDim, bStmCt);
			reflexes = new Reflexes(reflexList);
			drives = new Drives(driveList);
			memorizer = new Memorizer(memoryHeight, drives.getGoals(), acceptableRange);		
		}
	init(bundle);
	}

	function cycle(iostm, dt){
		var combinedstm, curCluster;

		//cycle drives
		var drivesOutput=drives.cycle(iostm, dt);

		//merge iostm and drives output
		combinedstm = iostm.concat(drivesOutput);

		/*
		Keep track of last bStmCt stm, Array.concat combinedstm onto
		aforementioned stm. Set combinedstm to this val instead.

		Only call clusters.findNearestCluster, reflexes.cycle memorizer.memorizer and memorizer.query
		if we have last bStmCt stm in memory (dependent on curCluster)
		*/		

		var reflexOutput=[], memorizerOutput=null;
		if(prevstm.length === bStmCt){ //wait for prevstm buffer to fill up
			var backAndCurrentstm=[];
			for(var i=0;i<prevstm.length;i++){
				backAndCurrentstm= backAndCurrentstm.concat(prevstm[i]);
			}
			backAndCurrentstm=backAndCurrentstm.concat(combinedstm);

			//get nearest cluster for combined stm
			curCluster= clusters.findNearestCluster(backAndCurrentstm);

			//cycle reflexes
			if(_enableReflexes)
				reflexOutput=reflexes.cycle(curCluster, dt);

			//cycle memorizer	
			if(_enableMemories){
				memorizerOutput=memorizer.query(curCluster);
				memorizer.memorize(curCluster);
			}
		}

		//update previous stm buffer
		prevstm.push(combinedstm);
		if(prevstm.length>bStmCt)
			prevstm.shift();
	
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
	function toJsonString(fileName, suppressOutput){
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
		deflated.bStmCt=bStmCt;
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
				targetval:driveFns[i].targetval
			};
			deflatedDrives[i]=d;
		}
		deflated.drives=deflatedDrives;
		deflated.avgDriveval = drives.getAvgDriveval();
		deflated.avgDriveCtr = drives.getAvgDriveCtr();

		//save reflexes
		var reflexFns=reflexes.getReflexes(),deflatedReflexes=[],r;
		for(var i=0;i<reflexFns.length;i++){
			//convert functions to strings for storage
			var init='('+String(reflexFns[i].init)+')'.escapeSpecialChars();
			var matcher='('+String(reflexFns[i].matcher)+')'.escapeSpecialChars();
			var response='('+String(reflexFns[i].response)+')'.escapeSpecialChars();
			r={
				init:init,
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
		toJsonString:toJsonString,
		getProperties:getProperties
	};
});

/**
	The cerebral cortex of the a.i. Hierarchically, temporally memorizes
	moments in time represented by vectors combining stm and drive states.
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

		/*The default homeostasis goal val is for test purposes only. The _homeostasisGoal 
		parameter should always be included when initializing Meorizer.*/
		if(typeof _homeostasisGoal !== "undefined")
			homeostasisGoal = _homeostasisGoal;
		else
			homeostasisGoal=[0,0,0,0,0]; //default for test purposes
	}
	init();

	/**
		Takes a cluster containing vector representing current i/o stm state combined with current 
		drive state.
		@returns A vector representing the next action agent should take to minimize homeostasis differential.
		If no vector is within acceptable range, return null.
	*/
	function query(cluster){
		var outputstm=null, stimDist, sd;

		/*TODO:this query could be improved to log(h) if the data was sorted according to dist from
		homeostasis goal * some multiplier for height val (to disincentivize longer-term solutions)
		*/
		for(var i=0; i<height; i++){
			//At each level, compare time series' end drive state with homeostasis goal.
			//If result < acceptable range, return time series' starting ouput stm (what agent will act on).
			
			if(level[i].series.hasOwnProperty(cluster.id)){
				sd = sqDist(level[i].series[cluster.id].es.slice(-homeostasisGoal.length), homeostasisGoal);
				if(sd <= acceptableRange){
					outputstm = level[i].series[cluster.id].ss;
					//console.log('output stm lvl:'+ i);
					break;
				}
				//console.log('query distance:'+sd);
			}
			//if no match is within acceptable range, go to next level
		}

		return outputstm;
	}

	/**
		Memorizes stm
	*/
	function memorize(cluster){
		/*
			Loop through each time level. At level i, a memory series is i+2 moments long. 
			The only moments we need to store in the series are the start and end moments, though.
			
			Every level has a counter, that is reset every time a new memory sequence starts. The memory
			sequence counts to i+2	

			Each vector is a reference to to a cluster's stm array, making this an efficient way
			to re-use the existing memory allocations (only need to store a pointer instead of the raw
			vector data).
		*/
		//fs=firstState, ss=secondState, es=endState
		var sd1,sd2,size, fs, ss, es, maxCollisions=100000;

		//update the buffer
		buffer.push(cluster);
		if(buffer.length>height)
			buffer.shift(); //this may be an O(n) implementation. Think about changing.

		for(var i=0; i<height; i++){
			size=i+3;
			fs=buffer.length-size;
			ss=buffer.length-size+1;
			es=buffer.length-1;

			//Once we have a buffer full enough for this level, add a memory every cycle
			if(buffer.length>=size){
				
				/*
				If series' end state is less different from homeostasis goal than   
				current series stored at this start state, overwrite. If no current series is stored
				at this start state, store it regardless.
				*/				
				if(level[i].series.hasOwnProperty(buffer[fs].id)){
					/*
					If same first and second states are the same, store the memory
					as weighted average of the two memories(same firstState and ss, es drive vals become
					weighted average)

					This handles the case where a previously optimal memory leads to a less optimal outcome, which 
					should raise its cost for future queries. Also if a less optimal outcome becomes more optimal,
					increase fitness. 

					It also simulates how behavior "hardens" as it is carried out more and more often
					by using a weighted average that increases with number of cs (collisions).
					The averaging step is weighted in favor of the existing drive es,
					based on how many ss cs have occurred. The more cs, the more the
					averaging step is weighted towards the existing drive es. This requires storing an 
					extra number holding the ss collision count, reset every time new ss and es
					is selected (as opposed to non-weighted average).

					Note that I am creating copies of all arrays as of 3/6/15. This is because although storing them
					by reference to clusters is more memory efficient, editing the cluster vals was breaking the kd tree.
					*/		
					if(sqDist(buffer[ss].stm, level[i].series[buffer[fs].id].ss) === 0){
						var bufferGoalDist = buffer[es].stm.slice(-homeostasisGoal.length);
						var esGoalDist = level[i].series[buffer[fs].id].es.slice(-homeostasisGoal.length);
						level[i].series[buffer[fs].id].cs++;
						//clamp upper bound to keep memory from getting too 'stuck'
						if(level[i].series[buffer[fs].id].cs>maxCollisions)level[i].series[buffer[fs].id].cs=maxCollisions;

						for(var j=0;j<bufferGoalDist.length;j++){
							var cs=level[i].series[buffer[fs].id].cs;
							esGoalDist[j]= ((esGoalDist[j]*cs)+bufferGoalDist[j])/(cs+1);
						}
						var args = [-homeostasisGoal.length, homeostasisGoal.length].concat(esGoalDist);
						Array.prototype.splice.apply(level[i].series[buffer[fs].id].es, args);	
					}
					else{ 
						//second states are different. Figure out which one leads to better outcome.
						//TODO:think about weighting the result in favor of sd1 based on cs property somehow,
						//to simulate the stickiness of a memory
						sd1 = sqDist(buffer[es].stm.slice(-homeostasisGoal.length), homeostasisGoal);
						sd2 = sqDist(level[i].series[buffer[fs].id].es.slice(-homeostasisGoal.length), homeostasisGoal);
						//sd2 is the current memory, the following line makes it harder to 'unstick'
						//the current memory the more it has been accessed
						if(sd1 < sd2*(1/(1+level[i].series[buffer[fs].id].cs/maxCollisions))){
							/*
							TODO: 
							-Use the sliced arrays to find nearest neighbor clusters. 
							-Store nearest neighbor clusters. When an Ihtai is JSON stringified, store the
							cluster id instead of the array. 
							-When an ihtai is de-stringified, use the cluster id to reference the ihtai cluster value.
							*/
							/*
							BUG:
							These stored values are ignoring backMemory. Should use dynamic programming
							access to Clusters.combinedSignal like the kd tree. Probably makes sense to 
							use the same cache object from Ihtai.utils. All comparisons should be done
							against this value, not a cluster's .stm property which only represents the
							current moment in time (ignoring backMemory).
							EDIT:actually I don't think i need to care about this in either memorization or query
							*/
							//add memory series to level. Hash based on starting state cluster id.
							level[i].series[buffer[fs].id]={
								fs: buffer[fs].stm.slice(), 
								ss: buffer[ss].stm.slice(),
								es: buffer[es].stm.slice(),
								cs:0
							};
						}	
					}		
				}
				else{
					
					//no pre-existing memory using this key. add memory series to level. Hash based on starting state cluster id.
					level[i].series[buffer[fs].id]={
						fs: buffer[fs].stm.slice(), 
						ss: buffer[ss].stm.slice(),
						es: buffer[es].stm.slice(),
						cs:0
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

//clusters are 'buckets' that n-dimensional stm moments are placed inside
//_kdTree is an optional param
var Clusters = (function(_numClusters, _vectorDim, bStmCt, _kdTree){
	var vectorDim=_vectorDim, clusterTree;
	var numClusters = _numClusters;	
	/**
		Individual clusters have the following properties:
		id: a unique id
		stm: a vector representing stm
		bStm: (array) the array of back-memories' indices/id that combine with id cluster val to make a key 
		combinedSignal: (function) returns an array representing all back-memory signals plus stm signal		
	*/

	/**
		-randomly assign k clusters over n-dimensional vector space
		@param {number} k
	*/
	function init(_kdTree){	
		var clusters=[];
		/*
		TODO: add ability to distribute random n-dimensional vals by weighted range,
		as in rejection sampling: http://stackoverflow.com/questions/8435183/generate-a-weighted-random-number
		*/

		/*
		TODO: think about distributing points using a low-discrepancy sequence instead of randomly
		(http://stackoverflow.com/questions/10644154/uniform-distribution-of-points)
		It seems like there are significant gaps in mapping space even with cluster vals of 100,000 with
		pseudo-random uniform distribution.
		*/

		//note that this function will be appended to indiv. clusters, meaning the bStms and
		//stm variables will be relative to said cluster.
		var combinedSignal = function(){
			var output=[];
			for(var i=0;i<this.bStm.length;i++){
				output= output.concat(clusters[this.bStm[i]].stm);
			}
			output=output.concat(this.stm);
			return output;
		}			

		if(typeof _kdTree == "undefined"){
			//create clusters with id(needs to be unique) and stm properties
			for(var i=0;i<numClusters;i++){
				clusters[i]={id:i, stm:[], bStm:[]};
				//map clusters to random points in n-dimensional space 
				for(var j=0;j<vectorDim;j++){
					//assumes vectors are normalized to a 0-100 scale
					if(i==0){ //test cluster
						clusters[i].stm[j]=50;
					}
					else{
						clusters[i].stm[j]=Math.round(Math.random()*100);
					}
					
				}

				//randomly assign back-memory cluster ids
				for(j=0; j<bStmCt; j++){
					clusters[i].bStm[j]= Math.floor(Math.random()*(numClusters-1));
				} 				
			}

			//populate kd-tree
			clusterTree= new IhtaiUtils.KdTree(clusters, combinedSignal);
		}
		else{
			clusterTree= new IhtaiUtils.KdTree(_kdTree, combinedSignal, true);

			//since function objects are ignored in json, clusters combinedSignal is stripped
			//and needs to be added back to every object

			//rebuild clusters array b/c that's the only way to efficiently search for
			//bStm ids by key			
			node=clusterTree.getRoot();

			function inorder(node){
				if (node==null)
					return;
				inorder(node.l);

				clusters[node.val.id]=node.val; //rebuild clusters array to use as lookup table for bStm

				inorder(node.r);
			}

			inorder(node);
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

	/*
	WARNING: order cluster id's by inorder traversal. Only run before Ihtai starts 
	memorizing or else the keys won't match up with their associated memory height arrays anymore.
	*/
	function orderKeys(){
		var ctr=0, node=clusterTree.getRoot();

		function inorder(node){
			if (node==null)
				return;
			inorder(node.l);
			node.val.id=ctr++;
			inorder(node.r);
		}

		inorder(node);
	}	

	return {
		findNearestCluster: findNearestCluster,
		getClusterTree: getClusterTree,
		orderKeys: orderKeys
	};
});

/**
	Drives are internal stm with states determined by algorithms that take each other and external stm 
	as inputs. Each drive contains a method which maps io stm and other drive states into an output
	drive state.

	@params drives: Array. An array of drive methods. Each drive takes form {init:function, cycle:function}
*/
var Drives = (function(_drives){
	var drives = _drives; avgDriveval=[];avgDriveCtr=0;
	function init(){
		for(var i=0;i<drives.length;i++){
			drives[i].init();
			avgDriveval[i]=0;
		}
	}
	init();

	function cycle(ioStim, dt){
		var response=[];
		avgDriveCtr++;
		for(var i=0;i<drives.length;i++){
			//execute each method in drives once per cycle
			var r=drives[i].cycle(ioStim, dt);
			response.push(r); //expects each drives method to return a Number 0-100
			avgDriveval[i]= (avgDriveval[i]*avgDriveCtr + r)/(avgDriveCtr + 1);
		}
		//keep track of average drive val. todo: make useful when some drive states don't have goals of 0
		return response;
	}

	function getDrives(){
		return drives;
	}

	function getGoals(){
		var goals=[];
		for(var i=0;i<drives.length;i++){
			goals.push(drives[i].targetval);
		}
		return goals;
	}

	function getAvgDriveval(){
		return avgDriveval;
	}
	function setAvgDriveval(v){
		avgDriveval=v;
	}
	function getAvgDriveCtr(){
		return avgDriveCtr;
	}
	function setAvgDriveCtr(c){
		avgDriveCtr=c;
	}

	return {
		cycle:cycle,
		getDrives:getDrives,
		getGoals:getGoals,
		getAvgDriveval:getAvgDriveval,
		getAvgDriveCtr:getAvgDriveCtr,
		setAvgDriveval:setAvgDriveval,
		setAvgDriveCtr:setAvgDriveCtr
	};
});

/**
	Reflexes are actions that can be 'hot-triggered' every cycle. They map certain input stm vectors to set output responses,
	Ex: a knee nerve stimulation of sufficient level triggers a kick reflex.

	Reflexes also serve the purpose of seeding the Memorizer with behaviors that it can build on.
*/
var Reflexes = (function(_reflexes){
	/*
	each reflex is an object that contains:
	matcher: vector indices to match against, in the form of {indices:[], signal:[]}
	response: the reflex response, in the form of {indices:[], signal:[]}. The responseLevels part is a vector
	of the dimensions described by the indices part. So a match containing only the second index would return
	a 1-d vector signal, which would be sent as an output stm to the second index.
	*/
	var reflexes = _reflexes;
	function init(){
		for(var i=0;i<reflexes.length;i++){
			reflexes[i].init();
		}
	}	
	init();

	function cycle(cluster, dt){
		var output=[], matcher, response, indices, stm=cluster.stm, ctr;
		//cluster has properties: id, stm
		for(var i=0; i<reflexes.length;i++){
			matcher=reflexes[i].matcher;
			if(matcher(stm, dt))
				output.push(reflexes[i].response(stm));
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