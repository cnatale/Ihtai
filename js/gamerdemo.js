// contents of main.js:
require.config({
    paths: {
        /*foo: 'libs/foo-1.1.3'*/
    },
    packages: [

    ]
});

var eyePos={x:0,y:0}, focusWidth=/*160*/40, focusHeight=/*120*/30, slidingWindowHBlocks=3, slidingWindowVBlocks=2, ihtaiPaused=false;
require([], function(){
	//////////// Load File Functionality /////////////////
	if (window.File && window.FileReader && window.FileList && window.Blob) {
	  // Great success! All the File APIs are supported.
	} else {
	  alert('The File APIs are not fully supported in this browser.');
	}

	var shouldOpenFile=false;
	var file;
	function openFile(){
	    var reader = new FileReader();
	  	reader.onload=(function(theFile){
	    	//call runapp with the content passed as param
			return function(e) {
				var ihtaiJsonString=e.target.result;
				//instantiate ihtai with loaded file
				ihtai= new Ihtai(ihtaiJsonString);
				ihtaiPaused=false;
				console.log('ihtai loaded');
        	};
	  	})(file);

	  	reader.readAsText(file);
	}

    function handleFileSelect(evt) {
	    var files = evt.target.files; // FileList object
	    file= files[0];
	    shouldOpenFile=true;
    }

    document.getElementById('files').addEventListener('change', handleFileSelect, false);
   
    //////////////////////////////////////////////////////
    var prevBwImgData=[];
    var i, j;
    for(i=0;i<slidingWindowHBlocks*slidingWindowVBlocks;i++){
    	prevBwImgData[i]=0;
    }
	var lastTime, lastKeypress=0, prevQuadrant=0;
	var directionKeySignal=0;
    var viewWidth = /*800*/320;
    var viewHeight = /*600*/240;	

	var pleasureDrive={
		init:function(){
			this.pleasure=0;
			return this.pleasure;
		},
		cycle:function(stimuli, dt){
			//update pleasure on score increase, slowly decrement over time
			this.pleasure-= .01 * dt;
			if(this.pleasure<0)
				this.pleasure=0;
			if(feelingPleasure)
				this.pleasure=3;

			//clamp vals
			$("#pleasure").html("pleasure: "+Math.floor(this.pleasure));	
			return Math.round(this.pleasure);
		},
		targetval:3 //the goal value for pleasure
	};
	var painDrive={
		init:function(){
			this.pain=0;
			return this.pain;
		},
		cycle:function(stimuli,dt){
			//increment pain on death, slowly decrement over time
			this.pain-= .01 * dt;
			if(this.pain<0)
				this.pain=0;
			if(feelingPain)
				this.pain= 3;

			//clamp vals
			$("#pain").html("pain: "+Math.floor(this.pain));	
			return Math.round(this.pain);
		},
		targetval:0 //the goal value for pain
	};
	var aggressionDrive={
		init:function(){
			this.aggression=3;
			return this.aggression;
		},
		cycle:function(stimuli,dt){
			this.aggression-= .01 * dt;
			if(this.aggression < 0){
				this.aggression=0;
			}

			//ship moved forward
			if(stimuli[0] == 1)
				this.aggression=3;

			//clamp vals
			$("#aggression").html("anti-movement: "+Math.floor(this.aggression));	
			return Math.round(this.aggression);			
		},
		targetval:0 //the goal value for pain
	};		
	drives=[pleasureDrive, painDrive, aggressionDrive];


	var reflexes = [
	/*{
		init:function(){
		    this.weightedDirection=[];
		    for(var i=0;i<100;i++){
		    	this.weightedDirection[i]=IhtaiUtils.weightedRand({10:0.2, 30:0.1, 50:0.1, 70:0.1, 90:0.5});
		    }
		},
		matcher: function(stimuli){ //randomly select an arrow key
			return true; //always return a potential random action
		}, 
		response: function(stimuli){
			return {
				indices:[0],
				signal:[this.weightedDirection[Math.floor(Math.random()*99)]]
			}
		}
	}*/];

	//combine fire key signal with arrow keys, since game can only detect one keypress per cycle
	var distributionArr=[//fire, up, left, right, and no movement selector
						{0:.20, 1:.20, 2:.20, 3:.20, 4:.20},
						//current row and column eye position
						{0:.25, 1:.25, 2:.25, 3:.25},
						{0:.25, 1:.25, 2:.25, 3:.25}];
	//bitmap block b/w values
	for(var i=0;i<slidingWindowHBlocks*slidingWindowVBlocks;i++){
		distributionArr.push({0:.5,1:.5});
	}
	//drives
	for(var i=0; i<3;i++){
		distributionArr.push({0:.25, 1:.25, 2:.25, 3:.25});
	}
	
    ihtai = new Ihtai({
		clusterCount:/*20480*/2000,
		vectorDim:12,/*number of iostimuli values + drives*/
		memoryHeight:300,/*how many steps ahead can ihtai look for an optimal stimuli trail?*/
		drivesList:drives,
		reflexList:reflexes,
		acceptableRange:144,/*max val is 144*//*acceptable range for optimal stimuli is in square dist*/
		bStmCt:0,
		distribution:distributionArr
	});		

	//var intervalID = window.setInterval(updateIhtai, 33);
	window.updateIhtai=updateIhtai;

	/*
	TODO: add listeners for up, left, right char codes, space bar
	When a key is detected, set associated signal to correct state for that cycle.
	Remember to turn off again after said cycle.
	
	//$( "#canvas").trigger( "", [ "Custom", "Event" ] );	

	JavaScript key codes:
	http://www.cambiaresearch.com/articles/15/javascript-char-codes-key-codes
	*/

	/*
	TODO: Edit Asteroids code so that it publishes events when score increases and
	player loses a life. Add subscribers here for each. When either is detected, 
	set associated signal to correct state for that cycle. Remember to turn off again
	after said cycle.
	*/
	var feelingPleasure=false, feelingPain=false;
	$("#canvas").on( "scoreIncrease", function(event) {
		feelingPleasure=true;
	}); 
	$("#canvas").on( "death", function(event) {
		feelingPain=true;
	});

    //get canvas and context reference
  	var canvas = $("#canvas");    
	ctx= canvas[0].getContext("2d");


	//declare function variables here so they aren't instantiated every iteration, limiting gc
	var td, time, imageData, data, grayscale, grayscaleImgData, cycleArr, res, e, visLog;
	//grayscale function var declarations
	var output, row=0, col=0, eyePosRow=0, eyePosCol=0, pctX, pctY, i, gray;
	var bwSum=[
		[0,0],
		[0,0],
		[0,0]
	];

	function updateIhtai(){
		if(!ihtaiPaused){
			if(shouldOpenFile){
				ihtaiPaused=true;
				openFile();
				shouldOpenFile=false;	
				return;	
			}

	    	time=new Date().getTime();
	    	if(lastTime)
	    		td=time-lastTime;
	    	else
	    		td=0;
	    	lastTime=time;		
			
			imageData = ctx.getImageData(eyePos.x, eyePos.y, focusWidth, focusHeight);
			data=imageData.data;

			grayscale = function(d) {
				//output=[];
				//reset bwSum values
				for(i=0;i<bwSum.length;i++){
			    	for(j=0;j<bwSum[0].length;j++){
			    		bwSum[i][j]=0;
			    	}
			    }

			    for (i=0; i<d.length; i+= 4) {
			    	//var avg = (d[i] + d[i +1] + d[i +2]) / 3;		    	
			    	gray=d[i+3];
			    	d[i]     = 0; // red
			    	d[i + 1] = 0; // green
			    	d[i + 2] = 255; // blue
			    	d[i + 3] = 255;
			    	o=gray/2.55//the 2.55 is a normalizer to scale 0-255 to 0-100
			    	//output.push(o); 

			    	//calculate which of six buckets pixel val goes into
			    	col=(i/4)%focusWidth; //x position
			    	row=Math.floor((i/4)/focusWidth); //y position
			    	pctX=col/(focusWidth-1); //x percentage
			    	pctY=row/(focusHeight-1); //y percentage

			    	if(pctX <= .32){
			    		bwSum[0][Math.round(pctY)]+=o;
			    	}
			    	else if(pctX <= .65){
			    		bwSum[1][Math.round(pctY)]+=o;
			    	}
			    	else{
			    		bwSum[2][Math.round(pctY)]+=o;
			    	}
			    }
			    ctx.putImageData(imageData, eyePos.x, eyePos.y);

			    //we have summed values grouped into 3x2 grid. Normalize (divide by total # pixels in each group).
			    for(i=0;i<bwSum.length;i++){
			    	for(j=0;j<bwSum[0].length;j++){
			    		if(bwSum[i][j]>0)
			    			bwSum[i][j]=1;
			    		else
			    			bwSum[i][j]=0;
			    	}
			    }

			    //return output;
			};			
			//grayscaleImgData= grayscale(data);
			grayscale(data);
 
			cycleArr=[directionKeySignal, eyePosRow, eyePosCol];
			//visLog="";
		    for(i=0;i<bwSum.length;i++){
		    	for(j=0;j<bwSum[0].length;j++){
		    		cycleArr.push(bwSum[i][j]);
		    		//visLog=visLog+bwSum[i][j];
		    	}
		    }

		    //console.log(visLog);

			res=ihtai.cycle(cycleArr, td);

			lastKeypress +=td;

			if(res.memorizerOutput != null /*&& lastKeypress > 100*/ && Math.random() > .1 /*prevent overfitting*/){
				//read res keypad signals, and trigger keyboard events per signal output
				directionKeySignal=res.memorizerOutput[0];

    			if(directionKeySignal == 0){
    				//fire key pressed
					e = jQuery.Event("keydown");
					e.which = 32; // # Some key code value
					$(window).trigger(e);	    				
    			}
	    		else if(directionKeySignal == 1){
	    			//up key pressed
					e = jQuery.Event("keydown");
					e.which = 38; // # Some key code value
					$(window).trigger(e);	    			
	    		}
	    		else if(directionKeySignal == 2){
	    			//left key pressed
					e = jQuery.Event("keydown");
					e.which = 37; // # Some key code value
					$(window).trigger(e);	    			
	    		}else if(directionKeySignal == 3){
	    			//right key pressed
					e = jQuery.Event("keydown");
					e.which = 39; // # Some key code value
					$(window).trigger(e);	    			
	    		}
	    		else{
	    			//no key pressed
	    		}

				console.log('memory');
				lastKeypress=0;
			}
			else{
				//TODO:act on instinct, which in this case is random keypad signals.
				//Trigger keyborad events based on instinct
		    	if(true /*&& lastKeypress > 100*/){
		    		directionKeySignal=Math.round(Math.random()*4);
			    	
	    			if(directionKeySignal == 0){
	    				//fire key pressed
						e = jQuery.Event("keydown");
						e.which = 32; // # Some key code value
						$(window).trigger(e);	    				
	    			}
		    		else if(directionKeySignal == 1){
		    			//up key pressed
						e = jQuery.Event("keydown");
						e.which = 38; // # Some key code value
						$(window).trigger(e);	    			
		    		}
		    		else if(directionKeySignal == 2){
		    			//left key pressed
						e = jQuery.Event("keydown");
						e.which = 37; // # Some key code value
						$(window).trigger(e);	    			
		    		}else if(directionKeySignal == 3){
		    			//right key pressed
						e = jQuery.Event("keydown");
						e.which = 39; // # Some key code value
						$(window).trigger(e);	    			
		    		}
		    		else{
		    			//no key pressed
		    		}
		
		    		//console.log('reflexes')
		    		lastKeypress=0;
		    	}  			
			}

			function setEyePos(){
				/*if(res.memorizerOutput != null && Math.random() > .1){
					eyePosRow=res.memorizerOutput[1];
					eyePosCol=res.memorizerOutput[2];
					eyePos.x=(eyePosCol/8) * viewWidth;
					eyePos.y=(eyePosRow/8) * viewHeight;					
					prevQuadrant= Math.floor((eyePos.y/viewHeight)*64) + Math.floor((eyePos.x/viewWidth)*8);
					prevQuadrant++;		
					prevQuadrant=prevQuadrant%64;				
				}
				else{*/
					//loop through a 4x4 grid of possible positions
					eyePosRow=Math.floor(prevQuadrant/8);
					eyePosCol=prevQuadrant%8;

					eyePos.x=(eyePosCol/8) * viewWidth;
					eyePos.y=(eyePosRow/8) * viewHeight;
					prevQuadrant++;		
					prevQuadrant=prevQuadrant%64;
				//}
			}
			setEyePos();	   	
			//console.log('eyepos'+ eyePos.x+', '+eyePos.y)
		
			feelingPleasure=false;feelingPain=false;
		}
	}

	$("#saveBtn").click(function(e){
		var jsonString=ihtai.toJsonString('IhtaiDemo');
		download(new Blob([jsonString]), "ihtaiSave.json", "text/plain");
	});	
});