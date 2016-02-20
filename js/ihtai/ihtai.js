"use strict";
/**
Copyright (c) 2015 Chris Natale

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
**/

/**
* Core Ihtai Module
*
* @module Ihtai
*/

/**
 * Creates Ihtai instances which act based on a combination of preprogrammed reflex behaviors, ideal drive states which the agent constantly 
 * strives to better reach, and subjective stimuli experience. 
 *
 * Besides manually created Drive Objects, programmers will typically only need to work with Ihtai instances, as well as the instance's cycle() and
 * daydream() methods. All other library functionality is abstracted.
 *
 * @class Ihtai
 * @constructor
 * @param bundle {Object}
 * @param bundle.clusterCount {Number} The maximum number of clusters this Ihtai instance will initialize before switching to 
 * a kd-tree.
 * @param bundle.vectorDim {Number} The number of input/output stimuli, plus the number of drives.
 * @param bundle.memoryHeight {Number} The number of cycles in advance an Ihtai instance can look for best-case drive states to act on.
 * @param bundle.drivesList {Array} An array of Drive objects representing all drives attached to this Ihtai instance.
 * @param bundle.reflexList {Array} Deprecated. Pass in an empty array.
 * @param [bundle.distanceAlgo] {String} Can be "avg" or "endState". Defaults to "avg".
 * @param [bundle.acceptableRange] {Number} The maximum possible drive distance value that the Ihtai instance will accept as a suitable state to act on.
 * Defaults to 10000000.

 * @example

	var hungerDrive={
		hunger:100, prevHunger:0,
		init:function(){
			return this.hunger;
		},
		cycle:function(stm, dt){
			this.prevHunger=this.hunger;
			if(stm[3] < 10){
				if(this.hunger>0){
					this.hunger-= 1;
				}
				else
					this.hunger=0;
			}
			else{
				if(this.hunger<100){
					this.hunger+= 1;
				}
				else{
					this.hunger=100;
				}
			}

			//clamp vals
			this.hunger=Math.min(this.hunger, 100);
			this.hunger=Math.max(this.hunger, 0);

			return Math.round(this.hunger);
		},
		undo:function(){
			this.hunger=this.prevHunger;
			return Math.round(this.hunger);
		},
		targetval:0 //the goal value for hunger
	};

	var drives=[hungerDrive];

 	var ihtai = new Ihtai({
		clusterCount:10000,
		vectorDim:6, //number of iostm values + drives
		memoryHeight:100, //how many steps ahead can ihtai look for an optimal stm trail?
		drivesList:drives,
		reflexList:[],
		acceptableRange:9999, //acceptable range for optimal stm is in square dist
		distanceAlgo:"avg" //avg or endState
	});

 */
var Ihtai = (function(bundle){
	var clusterCount, inputClusterDim, outputClusterDim, driveClusterDim, memoryHeight, driveList, reflexList, candidatePoolSize;
	var inputClusters, outputClusters, driveClusters, memorizer, drives, reflexes, acceptableRange, distanceAlgo, _enableReflexes=true, _enableMemories=true;
	var bStmCt=0, prevstm=[], driveGoals;
	var outputstm =[]; //the output stm buffer;

	if(typeof bundle=="string"){ //load from stringified json instead of default initialization
		var parsedFile=JSON.parse(bundle); 
		//inflate primitives attached to main json Object
		clusterCount= parsedFile.clusterCount;
		inputClusterDim=parsedFile.inputClusterDim;
		outputClusterDim=parsedFile.outputClusterDim;
		driveClusterDim=parsedFile.driveClusterDim;
		memoryHeight=parsedFile.memoryHeight;
		bStmCt=parsedFile.bStmCt;
		acceptableRange=parsedFile.acceptableRange;
		distanceAlgo=parsedFile.distanceAlgo;

		//rebuild kd-tree from binary heap
		var clusterHeap=parsedFile.clusterTreeHeap;
		var clusterTreeRoot=clusterHeap ? IhtaiUtils.binaryHeapToKdTreeRoot(clusterHeap) : null;

		//inflate clusters
		//TODO: rework inflation now that we have 3 clusters Objects
		inputClusters = new Clusters({_numClusters:clusterCount, _vectorDim:inputClusterDim, _kdTree:clusterTreeRoot, bStmCt:bStmCt});
		outputClusters = new Clusters({_numClusters:clusterCount, _vectorDim:outputClusterDim, _kdTree:clusterTreeRoot, bStmCt:bStmCt});
		driveClusters = new Clusters({_numClusters:clusterCount, _vectorDim:driveClusterDim, _kdTree:clusterTreeRoot, bStmCt:bStmCt});


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
		//inflate individual drive functions back from strings by eval'ing them
		var deflatedDrives=parsedFile.drives,inflatedDrives=[],d;
		for(var i=0;i<deflatedDrives.length;i++){
			//convert functions to strings for storage
			d={
				init:eval(deflatedDrives[i].init),
				cycle:eval(deflatedDrives[i].cycle),
				undo:eval(deflatedDrives[i].undo),
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
		var memorizerTrees=parsedFile.memorizer.trees;
		memorizer = new Memorizer({_memoryHeight:memoryHeight, _goals:drives.getGoals(), _acceptableRange:acceptableRange, _distanceAlgo:distanceAlgo, _trees:memorizerTrees});
		clusters.setMemorizerRef(memorizer);
	}
	else{ //default logic for new instantiation
		if(typeof bundle == "undefined")
			throw "Error: no initialization object!"
		if(typeof bundle != "object")
			throw "Error: initialization parameter should be an Object or String!"

		if(!isNaN(bundle.clusterCount))
			clusterCount= bundle.clusterCount;
		else
			throw "Error: no 'clusterCount' property found in initialization Object!"
		if(bundle.inputClusterDim)
			inputClusterDim=bundle.inputClusterDim;
		else
			throw "Error: no 'inputClusterDim' property found in initialization Object!"		
		if(bundle.outputClusterDim)
			outputClusterDim=bundle.outputClusterDim;
		else
			throw "Error: no 'outputClusterDim' property found in initialization Object!"	
		if(bundle.driveClusterDim)
			driveClusterDim=bundle.driveClusterDim;
		else
			throw "Error: no 'vectorDim' property found in initialization Object!"								
		if(!isNaN(bundle.memoryHeight))
			memoryHeight=bundle.memoryHeight;
		else
			throw "Error: no 'memoryHeight' property found in initialization Object!"
		if(bundle.drivesList)
			driveList=bundle.drivesList;
		else
			throw "Error: no 'drivesList' property found in initialization Object!"
		if(bundle.distanceAlgo)
			distanceAlgo=bundle.distanceAlgo;
		else
			distanceAlgo="avg";
		if(bundle.candidatePoolSize)
			candidatePoolSize = bundle.candidatePoolSize;
		else
			candidatePoolSize = 100;

		if(!isNaN(bundle.acceptableRange))
			acceptableRange=bundle.acceptableRange;
		else
			acceptableRange=null;

		if(bundle.bStmCt)
			bStmCt=bundle.bStmCt;

		inputClusters = new Clusters({_numClusters:clusterCount, _vectorDim:inputClusterDim, bStmCt:bStmCt});
		outputClusters = new Clusters({_numClusters:clusterCount, _vectorDim:outputClusterDim, bStmCt:bStmCt});
		driveClusters = new Clusters({_numClusters:clusterCount, _vectorDim:driveClusterDim, bStmCt:bStmCt});
		//reflexes = new Reflexes(reflexList);
		drives = new Drives(driveList);
		driveGoals=drives.getGoals();
		memorizer = new Memorizer({_memoryHeight:memoryHeight, _goals:drives.getGoals(), _acceptableRange:acceptableRange, _distanceAlgo:distanceAlgo, _candidatePoolSize:candidatePoolSize});		
		inputClusters.setMemorizerRef(memorizer);
		outputClusters.setMemorizerRef(memorizer);
		driveClusters.setMemorizerRef(memorizer);
	}

	/**
	 * Updates an Ihtai instance's state based on new sensory information
	 *
	 * @method cycle
	 * @param iostm {Array} An array of input and output stimuli from the previous/current cycle.
	 * @param dt {Number} The difference in time between this cycle and the last one, in milliseconds.
	 * @return {Object} Contains the following properties: reflexOutput, memorizerOutput, drivesOutput.
	 * <ul><li>reflexOutput {Array} Deprecated. Do not rely on this.
	 * <li>memorizerOutput {Array} The Drive and Input/Output Stimuli (DIOS) response that the Ihtai
	 * instance associates with its best possible course of action based on current stimuli. Typically a developer
	 * will have their Ihtai instance act based on the drive outputs included in this array.
	 * <li>drivesOutput {Array} The current drive values, after cycle has finished executing. Note that
	 * this is different from memorizerOutput in that memorizerOutput is a prediction of the best course of action.
	 * drivesOutput is the current actual drive state.</ul>
	 * @example

	 	var result = ihtai.cycle(inputOutputStimuliArray, timeSinceLastCycle);
	 	
	 	// Assuming index 0 is a drive output we want the Ihtai instance to act with...
	 	var movementSpeed = result.memorizerOutput[0];

	 	if(movementSpeed != null){
	 		// Let Ihtai decide how fast out virtual being should move in order to best reach its ideal
	 		// drive state.
			virtualBeing.speed=movementSpeed; 
	 	}

	 */
	function cycle(iostm, dt){
		//iostm is now divided into sub-arrays: index 0 is input, index 1 is output, index 2 is drives

		var combinedstm, curClusters=[];

		//cycle drives
		var drivesOutput=drives.cycle(iostm, dt);

		//merge iostm and drives output
		iostm[2]=drivesOutput;
		combinedstm = iostm;
	
		var reflexOutput=[], memorizerOutput=null;

		//get nearest cluster for combined stm
		curClusters[0]=inputClusters.findNearestCluster(iostm[0]);
		curClusters[1]=outputClusters.findNearestCluster(iostm[1]);
		curClusters[2]=driveClusters.findNearestCluster(iostm[2]);

		if(typeof drivesOutput=='undefined')debugger;
		//console.log('query cluster id: ' + curClusters[0].id + "+" + curClusters[1].id + "+" + curClusters[2].id);
		//cycle memorizer	
		if(_enableMemories){
			memorizerOutput=memorizer.query(curClusters);
			memorizer.memorize(curClusters);
		}
	
		//send reflex output and memorizer output back to ai agent
		return {
			memorizerOutput:memorizerOutput,
			drivesOutput:drivesOutput
		};
	}

	function absDist(a, b){
		var d=0;
		//assumes a and b are the same length
		for(var i=0;i<a.length;i++){
			d+= Math.abs(a[i]-b[i]);
		}
		return d;		
	}

	/**
	 * Ihtai instance attempts to imagine carrying out alternative motor behavior than what actually
	 * happened last iteration. 
	 *
	 * If the new Drive and Input/Output Stimuli (DIOS) vector has never been
	 * experienced before, or the agent thinks it will result in a lower drive score than the input
	 * DIOS, the agent will treat the imagined stimuli as actual stimuli for this cycle.
	 *
	 * The purpose of daydream is to give agents a way to act with novel motor behavior for situations
	 * while still having a criteria as to whether these novel motor behaviors are more useful than prior
	 * learned behaviors.
	 *
	 * Note that the daydream method's parameters and output have an identical form to Ihtai.cycle(), with the 
	 * exception of the outputMotorIndices parameter.
	 *
	 * @method daydream
	 * @param iostm {Array} An array of input and output stimuli from the previous/current cycle.
	 * @param dt {Number} The difference in time between this cycle and the last one, in milliseconds.
	 * @param outputMotorIndices {Array} An array of output motor indices for this Ihtai instance. These
	 * are the indices that daydream will attempt to imagine alternatives to in order to find an action that
	 * could result in a lower drive score than the actual stimuli response.
	 * For example, if the Ihtai instance has only a movement output motor stimuli at index 2, then the developer
	 * would pass [2] for this parameter.
	 * @return {Object} Contains the following properties: reflexOutput, memorizerOutput, drivesOutput.
	 * <ul><li>reflexOutput {Array} Deprecated. Do not rely on this.
	 * <li>memorizerOutput {Array} The Drive and Input/Output Stimuli (DIOS) response that the Ihtai
	 * instance associates with its best possible course of action based on current stimuli. Typically a developer
	 * will have their Ihtai instance act based on the drive outputs included in this array.
	 * <li>drivesOutput {Array} The current drive values, after cycle has finished executing. Note that
	 * this is different from memorizerOutput in that memorizerOutput is a prediction of the best course of action.
	 * drivesOutput is the current actual drive state.</ul>
	 * @example

	 	var result;

	 	// Ihtai instances need at least one Cluster in memory as a seed before they can daydream.
	 	// That means the programmer must run Ihtai.cycle at least once before calling daydream.
	 	if(!firstCycle){
	 		// Assumes that 2 is the sole output motor index in inputOutputStimuliArray (the third parameter)...
			result = ihtai.daydream(inputOutputStimuliArray, timeSinceLastCycle, [2]);
	 	}
	 	else{
			result = ihtai.cycle(inputOutputStimuliArray, timeSinceLastCycle);
	 	}
	 	
	 	// Assuming index 0 is a drive output we want the Ihtai instance to act with...
	 	var movementSpeed = result.memorizerOutput[0];

	 	if(movementSpeed != null){
	 		// Let Ihtai decide how fast out virtual being should move in order to best reach its ideal
	 		// drive state.
			virtualBeing.speed=movementSpeed; 
	 	}

	 */
	function daydream(iostm, dt){
		//iostm is now divided into sub-arrays: index 0 is input, index 1 is output

		inputClusters.addCluster(iostm[0]); //always attempt to add input stm to clusters list	
		outputClusters.addCluster(iostm[1]);

		var imaginedStm, imaginedClusters=[], imaginedDrivesOutput, origIostm=[];
		origIostm[0]=iostm[0].slice();
		origIostm[1]=iostm[1].slice();	
		var targetDriveVals=drives.getGoals();

		//choose a random cluster
		var randomOutputCluster=outputClusters.getRandomCluster();
		var randomOutputStm=randomOutputCluster.stm.slice();

		imaginedStm = iostm.slice();
		imaginedStm[1]=randomOutputStm;
		imaginedDrivesOutput = drives.cycle(iostm, dt);		
		imaginedStm[2] = imaginedDrivesOutput;

		var imaginedMemorizerOutput=null;

		//get nearest cluster for imagined stms
		imaginedClusters[0] = inputClusters.findNearestCluster(imaginedStm[0]);
		imaginedClusters[1] = outputClusters.findNearestCluster(imaginedStm[1]);
		imaginedClusters[2] = driveClusters.findNearestCluster(imaginedStm[2]);

		//run memorizer.query with cluster selected based on iostm's modified value
		imaginedMemorizerOutput = memorizer.query(imaginedClusters);

		//Check if a stimuli with this pattern has ever been memorized before. Possible if 
		//cluster was just created and hasn't propagated through buffer into memory chains yet.
		if(imaginedMemorizerOutput[0]==null){
			//If no, try the imagined memory no matter what.	
			memorizer.memorize(imaginedClusters);

			if(typeof imaginedDrivesOutput=='undefined')debugger;
			//return imagined reflex output and memorizer output back to ai agent
			return {
				memorizerOutput:imaginedMemorizerOutput,
				drivesOutput:imaginedDrivesOutput
			};
		}
		else{
			/*
			  Figure out if the predicted square distance of the imagined output is lower than 
			  that of the queried output. If yes, memorize the imagined output. If no, revert 
			  back to queried output, re-run drives.cycle(), and memorize the queried output.
			*/
			
			//call each drive's undo() method to revert previous cycle
			drives.undo();
			var realDrivesOutput=drives.cycle(origIostm, dt);
			origIostm[2]=realDrivesOutput;

			var realClusters=[];
			realClusters[0] = inputClusters.findNearestCluster(origIostm[0]);	
			realClusters[1] = outputClusters.findNearestCluster(origIostm[1]);
			realClusters[2] = driveClusters.findNearestCluster(origIostm[2]);
			var realMemorizerOutput=memorizer.query(realClusters);

			/*  Determine if the daydream result is anticipated to be closer to ideal 
			    drive state than normal query. If yes, return daydream result. If no, 
			    return normal query result. */

			//store the square distances to ideal drive states for imagined and real memorizer output
			var imaginedOutputSd=imaginedMemorizerOutput[1]; //the queried sd
			var realOutputSd=realMemorizerOutput[1]; //the queried sd

			////////////////////////////////////////////////////////////////////////////////////////////////
			//if the real stimuli hasn't been experienced yet, or if it has a smaller sd the the imagined stm, memorize it
			if(typeof realOutputSd != 'undefined' && imaginedOutputSd<realOutputSd){ //use daydream output
				//memorize the imagined cluster
				drives.undo();
				imaginedDrivesOutput=drives.cycle(imaginedStm/*iostm*/, dt);
				memorizer.memorize(imaginedClusters);					

				if(typeof imaginedDrivesOutput=='undefined')debugger;
				//return imagined output back to ai agent
				return {
					memorizerOutput:imaginedMemorizerOutput,
					drivesOutput:imaginedDrivesOutput
				};		
			}
			else{ //use regular stimuli query output

				//memorize the real cluster
				memorizer.memorize(realClusters);
			
				if(typeof realDrivesOutput=='undefined')debugger;
				//return queried output back to ai agent
				return {
					memorizerOutput:realMemorizerOutput,
					drivesOutput:realDrivesOutput
				};									
		
			}

		}
	}	

	function enableReflexes(state){
		_enableReflexes=state;
	}
	function areReflexesEnabled(){
		return _enableReflexes;
	}
	/**
	* Enable or disable new memory creation. WARNING: experimental
	* @method enableMemories
	* @param state {Boolean} true for enable, false for disable
	*/
	function enableMemories(state){
		_enableMemories=state;
	}
	/**
	* Find out if new memory creation is enabled or disabled.
	* @method areMemoriesEnabled
	* @return {Boolean} True is yes, false if no.
	*/	
	function areMemoriesEnabled(){
		return _enableMemories;
	}

	/**
	* Converts an Ihtai instance into a json string for storage
	* @method toJsonString
	* @return {String} The stringified, deflated, json representation of the Ihtai instance.
	*/
	function toJsonString(){
		var deflated={};

		//store all information necessary to rebuild as json

		//save clusterTree
		var clusterTree=clusters.getClusterTree();		
		var clusterHeap=clusterTree ? clusterTree.toBinaryHeap() : null; //Since heaps can be stored as arrays, this allows us to store the tree as a json property.
		deflated.clusterTreeHeap=clusterHeap;

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
			var undo='('+String(driveFns[i].undo)+')'.escapeSpecialChars();
			d={
				init:init,
				cycle:cycle,
				undo:undo,
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
			levels:memorizer.getLevels(),
			trees:memorizer.getTrees() //TODO: figure out a way to store Memorizer's memory chain trees
		};

		var stringifiedAndDeflated=JSON.stringify(deflated);
		return stringifiedAndDeflated;
	}

	/**
	 * Exports all hierarchical temporal data in an IHTAI instance as CSV data
	 *
	 * @method exportTemporalDataAsCSV
	 * @return {String} A String containing the instance's temporal data as csv. 
	 * The row number corresponds with the Cluster id.
	*/
	function exportTemporalDataAsCSV(){
		//call through to the memorizer, which holds this information
		return memorizer.exportTemporalDataAsCSV(clusterCount);
	}	

	/**
	* Returns an Object containing all of an Ihtai instance's properties.
	* @method getProperties
	* @return {Object}
	*/	
	function getProperties(){
		return {
			clusterCount:clusterCount, 
			vectorDim:vectorDim,
			memorizer:memorizer, 
			memoryHeight:memoryHeight, 
			driveList:driveList,
			/*reflexList:reflexList,*/
			
			clusters:clusters, 
			drives:drives, 
			reflexes:reflexes, 
			acceptableRange:acceptableRange,
			/*_enableReflexes:_enableReflexes, */
			_enableMemories:_enableMemories
		};
	}

	return {
		cycle:cycle,
		daydream:daydream,
		enableReflexes:enableReflexes,
		areReflexesEnabled:areReflexesEnabled,
		enableMemories:enableMemories,
		areMemoriesEnabled:areMemoriesEnabled,
		toJsonString:toJsonString,
		getProperties:getProperties,
		exportTemporalDataAsCSV:exportTemporalDataAsCSV
	};
});

/**
	The cerebral cortex of the a.i. Hierarchically, temporally memorizes
	moments in time represented by vectors combining stimuli and drive states.
*/
//params: _height, _homeostasisGoal, _acceptableRange, _buffer, _levels, _distanceAlgo
var Memorizer = (function(bundle){
	var height=bundle._memoryHeight, distanceAlgo, acceptableRange/*the square distance that matches must be less than*/;
	var level, buffer, homeostasisGoal, maxCollisions=1/*was 10*/, candidatePoolSize;

	/* 
		uidTrees and outputStmIdTables allow for efficient storage and retrieval of memory sequence data

		uidTrees: searcheable collections of memory chains, keyed off first state uid.
			schema: each tree is keyed off dist from ideal drive state

			
		outputStmIdTables schema: each key is a memory uid that references:
			-a hash table where each key is a second state output stimuli id for a memory chain, which references
			 a uidTree node from the tree with the same memory uid as this table's key.

		outputStmId represents second state output stimuli id, so ss[1].id (index 1 is output)
	*/
	var uidTrees = {}, outputStmIdTables = {};

	if(!isNaN(bundle._acceptableRange))
		acceptableRange=bundle._acceptableRange;
	else
		acceptableRange=10000000;

	function copyTemporalData(fromCluster, toCluster){
		if(typeof toCluster == 'undefined' || typeof fromCluster == 'undefined'){
			throw "Error: toCluster and fromCluster must both be of valid Cluster type with an id attribute."
		}

		var fromId=fromCluster.id, toId=toCluster.id;
		uidTrees[toId]= $R.createTree();
		//copy each level's series[id] from fromCluster to toCluster
		for(var i=0; i<height; i++){
			//deep copy the cluster temporal node
			if(level[i].series.hasOwnProperty(fromId)){
				level[i].series[toId]={
					fs: level[i].series[fromId].fs.slice(),
					ss: level[i].series[fromId].ss.slice(),
					es: level[i].series[fromId].es.slice(),					
					lvl: level[i].series[fromId].lvl,
					ct: level[i].series[fromId].ct,					
					sd: level[i].series[fromId].sd
				};
				
				//...and the cluster's tree
				uidTrees[toId].insert(level[i].series[toId]);
			}
		}

	}

	function init(){
		if(typeof bundle._buffer != "undefined" && typeof bundle._levels != "undefined"){
			//rebuild from existing buffer and level data
			buffer=bundle._buffer;
			level=bundle._levels;
		}
		else{
			//initialize an array of hashmaps representing all possible memories
			level=[], buffer=[];
			for(var i=0; i<height; i++){
				level[i]={};
				level[i].series={};
			}
		}
	
		if(typeof bundle._distanceAlgo !== "undefined")
			distanceAlgo=bundle._distanceAlgo;
		else
			distanceAlgo="avg";

		if(typeof bundle._candidatePoolSize !== "undefined")
			candidatePoolSize=bundle._candidatePoolSize;
		else
			candidatePoolSize=100;		

		if(typeof bundle._uidTrees != "undefined"){
			uidTrees=bundle._uidTrees;
			/*
			Iterate through uidTrees, and for each index intantiate a new tree, passing the index's tree as a param.
			This is necessary because json stringifying the tree instances strips out their methods. 
			*/
			for(var elm in uidTrees){
				//TODO: add method to redblack tree library that allows it to create a tree from array
				//uidTrees[elm]=new IhtaiUtils.Heap(minHeaps[elm].heap);
			}

		}

		/*The default homeostasis goal val is for test purposes only. The _homeostasisGoal 
		parameter should always be included when initializing Meorizer.*/
		if(typeof bundle._goals !== "undefined"){
			homeostasisGoal = bundle._goals;
		}
		else
			homeostasisGoal=[0,0,0,0,0]; //default for test purposes
	}
	init();

	/**
		Takes a cluster containing vector representing current i/o stm state combined with current 
		drive state.
		@returns An array consisting of two parts: 1) A vector representing the next action agent should take to minimize homeostasis differential.
		If no vector is within acceptable range, return null. 2) The square distance of the returned action stimuli from ideal drive state.
	*/
	function query(clusters){
		var outputMemory=null, stimDist, sd, combinedClustersId = IhtaiUtils.toCombinedStmUID(clusters);
		var tdist;
		if(uidTrees.hasOwnProperty(combinedClustersId)){
			try{ var min = $R.min( uidTrees[combinedClustersId], uidTrees[combinedClustersId].root ); 
			}
			catch(e){ 
				debugger;
				throw "Error: Memorizer.query() failed to execute redblack tree min search"; };
			
			tdist = min.tdist;
			var sd= min.sd;
			if(sd <= acceptableRange){
				// console.log('min.ss: '+min.ss);
				// console.log('min.es:'+min.es);
				// console.log('min.sd:'+min.sd);
				// console.log('acceptablerange:'+acceptableRange);
				//console.log('selected cluster id: ' + min.ss[0].id + "+" + min.ss[1].id + "+" + min.ss[2].id);

				outputMemory = min.ss.slice(); //pass a copy so that if user edits outputstm, it doesn't affect copy stored in tree
			}
		}

		return [outputMemory, sd, tdist];
	}

	/**
		Memorizes stm
	*/
	var temporalPlanners=0;
	function memorize(clusters){
		/*
			Think of this as a sliding window of possible new memories to learn.

			Loop through each time level. At level i, a memory series is i+2 moments long. 
			The only moments we need to store in the series are the start and end moments, though.
			Level i+1 is i+3 moments long, i+2 is i+4 moments long, etc.
			
			Every level has a counter, that is reset every time a new memory sequence starts. The memory
			sequence counts to i+2	

			Each vector is a reference to to a cluster's stm array, making this an efficient way
			to re-use the existing memory allocations (only need to store a pointer instead of the raw
			vector data).
		*/
		//fs=firstState, ss=secondState, es=endState
		var sd1,sd2,size, fs, ss, es, fsUid, seriesArray, sd, ssMatch, maxTreeNode, fsidTree;
		var INPUT = 0, OUTPUT = 1, DRIVES = 2;
		//update the buffer
		buffer.push(clusters);
		if(buffer.length>height)
			buffer.shift(); //this may be an O(n) implementation. Think about changing.
		/*
		Iterate through each temporal dist level, and add memory to tree if sq distance is less than highest sq dist in tree, or tree isn't full. 
		*/
		for(var i=0; i<height; i++){
			size=i+2;
			//Once we have a buffer full enough for this level, attempt to add a memory every cycle
			if(buffer.length>=size && size<=height){
				fs=buffer.length-size;
				ss=buffer.length-size+1;
				es=buffer.length-1;
				fsUid=IhtaiUtils.toCombinedStmUID(buffer[fs]);
				fsidTree = uidTrees[fsUid];

				var avg=[], temporalDist=0;

				if(distanceAlgo == "avg"){
					for( var j=ss; j<=es; j++ ){
						temporalDist++;
						if(j==ss){ //first iteration; set array to second state's drive values
							avg={stm:buffer[ss][DRIVES].stm.slice()};
						}
						else{
							//add drive stimuli for each moment in time between second state and end state.
							for(var k=0;k<avg.stm.length;k++){
								avg.stm[k]+=buffer[j][DRIVES].stm[k];
							}
						}
					}

					//loop over each index, dividing by total number of values. gives average drive values over time series.
					for(k=0;k<avg.stm.length;k++){
						avg.stm[k] = avg.stm[k]/temporalDist;
					}
				} else {
					avg={stm:buffer[es][DRIVES].stm.slice()};
				}
				
				////////////////////////////////////////////////				
				
				/*
				If series' end state is closer to homeostasis goal than   
				current series stored at this start state, overwrite. If no current series is stored
				at this start state, store it regardless.
				*/				
				ssMatch=false;
				if(uidTrees.hasOwnProperty(fsUid)){
					/*
					If first and second states are the same, store the memory
					as weighted average of the two memories(same firstState and ss; es drive vals become
					weighted average)

					This handles the case where a previously optimal memory leads to a less optimal outcome, which 
					should raise its cost for future queries. Also if stored outcome becomes more optimal,
					increase fitness. 

					It also simulates how behavior "hardens" as it is carried out more and more often
					by using a weighted average that increases with number of ct (collisions count).
					The averaging step is weighted in favor of the existing drive es,
					based on how many ss ct have occurred. The more ct, the more the
					averaging step is weighted towards the existing drive es. This requires storing an 
					extra number holding the ss collision count, reset every time new ss and es
					is selected (as opposed to non-weighted average).

					Note that I am creating copies of all arrays as of 3/6/15. This is because although storing them
					by reference to clusters is more memory efficient, editing the cluster vals here was breaking the kd tree.
					*/		

					/*
					Note that we are comparing second state output stimuli here (the ss[1].id). If the buffer and stored memory
					have the same output values at their second state, average their drive values. This is a way of
					saying, "we started at the same state. The next step's output was also the same. These are 
					effectively the same actions taken by the agent, so average their resulting drive scores."
					*/
					if( typeof outputStmIdTables[fsUid] === 'undefined') { debugger;}

					var ssOutputId = buffer[ss][OUTPUT].id + '+' + size;
					ssMatch = outputStmIdTables[fsUid].hasOwnProperty( ssOutputId );

					if( ssMatch ){
						var storedStm = outputStmIdTables[fsUid][ ssOutputId ];
						var bufferGoalDist = avg;
						var esGoalDist = storedStm.es.stm.slice();
						storedStm.ct++;
						//clamp upper bound to keep memory from getting too 'stuck'
						if(storedStm.ct>maxCollisions)
							storedStm.ct=maxCollisions;

						for(var j=0;j<bufferGoalDist.stm.length;j++){
							var ct=storedStm.ct;
							esGoalDist[j]= ((esGoalDist[j]*ct)+bufferGoalDist.stm[j])/(ct+1);
						}
						var args = [0, homeostasisGoal.length].concat(esGoalDist);
						//replace existing endstate stimuli with updated values
						Array.prototype.splice.apply(storedStm.es.stm, args);	
						//console.log('existing memory updated');
						
						//update sqdist of endstate from drive goals
						storedStm.sd= sqDist(storedStm.es.stm, homeostasisGoal);

						//delete from tree and insert in again to re-order;
						//since storedStm is a pointer to the node in our uidTree, we can delete easily then add again
						$R.del( uidTrees[fsUid], storedStm );
						$R.insert( uidTrees[fsUid], storedStm );
					} else {
						/* No matching second state drive output in memory. If buffer memory is closer to ideal drive state
							than the highest score in this fsUid's tree, get rid of the high score and replace with this.
						*/
						sd1= sqDist(avg.stm.slice(), homeostasisGoal);
						maxTreeNode=$R.max( uidTrees[fsUid], uidTrees[fsUid].root);
						sd2 = maxTreeNode.sd;
						//sd1 is the buffer memory, sd2 is the highest scoring memory in tree

						if(sd1 < sd2){
							//replace the currently stored memory with the better-scoring buffer counterpart
							var insertedNode = {
								fs:buffer[fs],
								ss:buffer[ss],
								es:avg,
								ct:maxCollisions,
								sd:sd1,
								tdist:size
							};
							ssOutputId = maxTreeNode.ss[OUTPUT].id + "+" + maxTreeNode.tdist;

							if( uidTrees[fsUid].size >= candidatePoolSize) {
								try {
									$R.del( uidTrees[fsUid], maxTreeNode );
									// delete maxTreeNode from lookup table
									delete outputStmIdTables[fsUid][ ssOutputId ];
								} catch(e) { debugger; }
							}
							$R.insert( uidTrees[fsUid], insertedNode );
							ssOutputId = insertedNode.ss[OUTPUT].id + "+" + size;
							outputStmIdTables[fsUid][ ssOutputId ] = insertedNode;
						}	
					}	
				}
				else {
					//no pre-existing memory using this key. add memory series to level. Hash based on starting state cluster id.
					//console.log('new memory created')

					/*memory cutoff so that we don't create more of these
					level[i].series[fsUid] Objects after too many have been made. prevents 
					engine from grinding to a halt due to lack of available memory.
					*/
					//if(temporalPlanners>3274926)
					//	return;

					/*
					no tree currently exists for this fsUid. Create one, add memory to tree, add reference to outputStmIdTables
					*/

					var insertedNode = {
						fs: buffer[fs], 
						ss: buffer[ss],
						es: avg,
						ct: maxCollisions,
						sd: sqDist(avg.stm, homeostasisGoal),
						tdist: size
					}
					uidTrees[fsUid] = $R.createTree('sd');
					$R.insert( uidTrees[fsUid], insertedNode );

					if (typeof outputStmIdTables[fsUid] === 'undefined' ) {
						outputStmIdTables[fsUid] = {};
					}

					ssOutputId = buffer[ss][OUTPUT].id + '+' + size
					outputStmIdTables[fsUid][ ssOutputId ] = insertedNode;
					/* Note that we don't need to check the candidatePoolSize here for a 
					   possible deletion because this isa brand new tree. */

					/*Keep track of total # of level[i].seriesArray[fsUid] Objects created.
					Multiply with IHTAI's clustercount property to get rough estimate of memory
					used by IHTAI. Check that against cutoff value.
					*/
					temporalPlanners++;
				}
			}
		}
	}

	function sqDist(a, b){
		var d=0;
		//assumes a and b are the same length
		for(var i=0;i<a.length;i++){
			d+= /*Math.pow(a[i]-b[i], 2);*/ Math.abs(a[i]-b[i]);
		}
		d = d/a.length;
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

	function getHeaps(){
		return minHeaps;
	}

	function exportTemporalDataAsCSV(clusterCount){
		var csv="";

		/*
		TODO: this isn't going to work anymore because the series properties are string indices
		*/
		for(var i=0;i<clusterCount;i++){

			for(var j=0;j<height;j++){
				if(typeof level[j].series[i] != 'undefined'){
					//csv+= level[j].series[i].ss.join(' + ');
					csv+=( level[j].series[i].fs[1] + '+' + level[j].series[i].fs[2] + '+' + level[j].series[i].fs[3] + '+' + level[j].series[i].fs[4] );
					csv+=",";
				}
			}
			csv+="\r\n";
		}

		return csv;
	}

	return {
		query: query,
		memorize: memorize,
		getHeight: getHeight,
		getLevels: getLevels,
		getBuffer: getBuffer,
		getHeaps: getHeaps,
		copyTemporalData: copyTemporalData,
		exportTemporalDataAsCSV: exportTemporalDataAsCSV
	}
});

//clusters are 'buckets' that n-dimensional stm moments are placed inside
//_kdTree is an optional param for reconstruction from a json string file
var Clusters = (function(/*_numClusters, bStmCt, _kdTree*/bundle){
	var clusterTree, cache={}, idCtr=0, memorizerRef;
	var numClusters = bundle._numClusters;	
	var bStmCt=bundle.bStmCt;

	var combinedSignal = function(){
		var output=[];
		output=output.concat(this.stm);
		return output;
	}	

	function setMemorizerRef(ref){
		memorizerRef=ref;
	}	

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
		function inorder(node){
			if (node==null)
				return;
			inorder(node.l);

			/*
			TODO: re-inflate cluster cache (the 'cache') property. This could be done without additional json storage by traversing 
			the kd-tree, running Array.join() on the node's stimuli, and using that joined value as the key.
			*/
			vStr=node.val.stm.join();
			cache[vStr]=node.val; //rebuild clusters array to use as lookup table for bStm

			inorder(node.r);
		}
		var clusters=[], vStr;

		//note that this function will be appended to indiv. clusters, meaning the bStms and
		//stm variables will be relative to said cluster.
		var combinedSignal = function(){
			var output=[];
			output=output.concat(this.stm);
			return output;
		}		

		/*
		This conditional is only triggered when saved clusters are loaded and the number of allocated clusters exceeds
		the user-defined maximum. We don't have to worry about checking for this here; the kd-tree won't be appended to the
		json if it isn't created in the first place due to this condition.
		*/
		if(typeof _kdTree != "undefined" && _kdTree != null){
			clusterTree= new IhtaiUtils.KdTree(_kdTree, combinedSignal, true);
			//since function objects are ignored in json, clusters combinedSignal is stripped
			//and needs to be added back to every object

			//rebuild clusters array b/c that's the only way to efficiently search for
			//bStm ids by key			
			node=clusterTree.getRoot();
			inorder(node);
		}
	}
	init(bundle._kdTree);


	/**
	* Adds a stimuli Array to Clusters list, if there is space and if Cluster with
	* matching stimuli has not already been added.
	* @method addCluster
	* @param {Array} v The stimuli to be added as a Cluster, in Array form.
	* @param {String} _vStr The vector v in comma-delimited String form. Saves 
	* computation so that if we've already performed String.join() on v, we don't have
	* to do it again.
	* @return nothing
	*/
	function addCluster(v, _vStr){
		var vStr;
		if(idCtr<numClusters){
			if(typeof _vStr != 'string')
				vStr= v.join();
			else
				vStr = _vStr; 

			if(typeof cache[vStr] == 'undefined'){
				cache[vStr]={
					id:idCtr++, stm:v
				}; 
			}
		}	
	}

	var clusterTreeCreated=false;
	/** 
		-find nearest cluster to v
		-calculate distance between v and nearest cluster
		-move cluster v a small amount closer to v's position
		@method findNearestCluster
		@return {Object} the nearest cluster to v
	*/
	function findNearestCluster(v){
		var nearestCluster;
		var vStr=v.join();

		if(!cache[vStr]){ //create new cluster or get nearest cluster from kd tree.

			//once idCtr gets too high, stop caching and build the kd-tree.
			//if not, memory gets so scarce that the gc is called constantly.
			if(idCtr<numClusters){
				addCluster(v, vStr);
			}
			else{
				//init clustertree from cache values,
				if(!clusterTreeCreated){
					//convert cache object into an array
					var cacheArr=[];
					for(var key in cache){
						if(cache.hasOwnProperty(key))
							cacheArr.push(cache[key]);
					}
					clusterTree= new IhtaiUtils.KdTree(cacheArr, combinedSignal);
					clusterTreeCreated=true;
				}
				//console.log('accessing cluster tree');
				//find nearest neighbor from kd-tree
				nearestCluster = clusterTree.nearestNeighbor(v);
				return nearestCluster;
			}
		}	

		//Successful match with stimuli already in cache. Return the cached stimuli.
		nearestCluster=cache[vStr];		
		return nearestCluster;
	}

	function getClusterTree(){
		return clusterTree;
	}

	/**
	* Returns a random Cluster from the collection of Clusters. Note that this 
	* does not create new Clusters, but only gives a reference to an existing one.
	* @method getRandomCluster
	* @return {Cluster} A random cluster that has already been created.
	*/
	function getRandomCluster(){
		var keys=Object.keys(cache);
		var randomKey=Math.round(Math.random()*(keys.length-1));
		return cache[keys[randomKey]];
	}

	return {
		findNearestCluster: findNearestCluster,
		getClusterTree: getClusterTree,
		getSize: function(){return idCtr;},
		getRandomCluster: getRandomCluster,
		setMemorizerRef: setMemorizerRef,
		addCluster: addCluster		
	};
});

/**
	Drives are internal stm with states determined by algorithms that take each other and external stm 
	as inputs. Each drive contains a method which maps io stm and other drive states into an output
	drive state.

	@params drives: Array. An array of drive methods. Each drive takes form {init:function, cycle:function}
*/
var Drives = (function(_drives){
	var drives = _drives, avgDriveval=[], avgDriveCtr=0;
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

	function undo(){
		var response=[];
		for(var i=0;i<drives.length;i++){
			try{
				var r=drives[i].undo();
				//var r=drives[i].undo.call(this);
			}
			catch(e){
				debugger;
			}

			response.push(r);
		}		
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
		undo:undo,
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