// contents of main.js:
require.config({
    paths: {
        /*foo: 'libs/foo-1.1.3'*/
    },
    packages: [

    ]
});

var eyePos={x:0,y:0}, focusWidth=20, focusHeight=20, ihtaiPaused=false;
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

	var prevBrightness=0, lastTime;
	var fireKeySignal=0, directionKeySignal=0;
    var viewWidth = 800;
    var viewHeight = 600;	
	var pleasureDrive={
		init:function(){
			this.pleasure=0;
			return this.pleasure;
		},
		cycle:function(stimuli, dt){
			//update pleasure on score increase, slowly decrement over time
			if(stimuli[2] > 50){
				if(this.pleasure<100){
					this.pleasure+= 100 /** dt*/;
				}
				else{
					this.pleasure=100;
				}
			}
			else{
				if(this.pleasure>0){
					this.pleasure-= .05 * dt;
				}
				else
					this.pleasure=0;				
			}

			//clamp vals
			this.pleasure=Math.min(this.pleasure, 100);
			this.pleasure=Math.max(this.pleasure, 0);
			$("#pleasure").html("pleasure: "+Math.floor(this.pleasure));	
			$("#avgPleasure").html("avg pleasure: "+Math.floor(ihtai.getProperties().drives.getAvgDriveValue()[0]));					
			return this.pleasure;
		},
		targetValue:100 //the goal value for pleasure
	};
	var painDrive={
		init:function(){
			this.pain=0;
			return this.pain;
		},
		cycle:function(stimuli,dt){
			//increment pain on death, slowly decrement over time
			if(stimuli[3] > 50){
				this.pain+= 100 /** dt*/;
			}
			else{
				this.pain-= 1 * dt;
			}

			//clamp vals
			this.pain=Math.min(this.pain, 100);
			this.pain=Math.max(this.pain, 0);
			$("#pain").html("pain: "+Math.floor(this.pain));	
			$("#avgpain").html("avg pain: "+Math.floor(ihtai.getProperties().drives.getAvgDriveValue()[1]));				
			return this.pain;
		},
		targetValue:0 //the goal value for pain
	};
	drives=[pleasureDrive, painDrive];


	var reflexes = [{
		init:function(){
		    this.weightedFire=[];
		    for(var i=0;i<100;i++){
		    	this.weightedFire[i]=Number(IhtaiUtils.weightedRand({0:.25, 100:.75}));
		    }
		},
		matcher: function(stimuli){ /*randomly press fire button*/
			return true; //always return a potential random action
		}, 
		response: function(stimuli){
			return {
				indices:[0],
				signal:[this.weightedFire[Math.floor(Math.random()*99)]]
			}
		}
	},
	{
		init:function(){
		    this.weightedDirection=[];
		    for(var i=0;i<100;i++){
		    	this.weightedDirection[i]=Number(IhtaiUtils.weightedRand({15:0.01, 35:0.25, 60:0.24, 85:.5}));
		    }
		},
		matcher: function(stimuli){ /*randomly select an arrow key*/
			return true; //always return a potential random action
		}, 
		response: function(stimuli){
			return {
				indices:[1],
				signal:[this.weightedDirection[Math.floor(Math.random()*99)]]
			}
		}
	}];

    ihtai = new Ihtai({
		clusterCount:100000,/*value of 100,000 seems to allow for memorizer to take over quickly*/
		vectorDim:8+(focusWidth*focusHeight)/*108*/,/*number of iostimuli values + drives*/
		memoryHeight:1000,/*how many steps ahead can ihtai look for an optimal stimuli trail?*/
		drivesList:drives,
		reflexList:reflexes,
		acceptableRange:600,/*600*//*acceptable range for optimal stimuli is in square dist*/
		backStimCt:1
	});		

	var intervalID = window.setInterval(updateIhtai, 33);


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

	function updateIhtai(){
		if(!ihtaiPaused){
			if(shouldOpenFile){
				ihtaiPaused=true;
				openFile();
				shouldOpenFile=false;		
			}

	    	var td;
	    	var time=new Date().getTime();
	    	if(lastTime)
	    		td=time-lastTime;
	    	else
	    		td=0;
	    	lastTime=time;		
			/*
			signal 0: score increase (less than 50 means no, over 50 means yes)
			signal 1: death (less than 50 means no death, over 50 means death)
			signal 2: joystick (either left, up, down, or no direction by splitting 0-100 signal in quarters)
			signal 3: fire button (space bar, less than...)
			remaining signals: grayscale image data 
			*/
			
			var imageData = ctx.getImageData(eyePos.x, eyePos.y, focusWidth, focusHeight);
			var data=imageData.data;

			var grayscale = function(d) {
				var output=[],ctr=0,sum=0;
			    for (var i = 0; i < d.length; i += 4) {
			    	//var avg = (d[i] + d[i +1] + d[i +2]) / 3;		    	
			    	var avg=d[i+3];
			    	//d[i]     = 255; // red
			    	//d[i + 1] = 0; // green
			    	//d[i + 2] = 0; // blue
			    	//d[i + 3] = 255;
			    	output.push(avg/2.55); //the 2.55 is a normalizer to scale 0-255 to 0-100
			    	ctr++;
			    	sum+=avg;
			    }
			    ctx.putImageData(imageData, eyePos.x, eyePos.y);
			    prevBrightness = sum/ctr; //avg brightness for this bitmap chunk
			    //console.log(prevBrightness);
			    return output;
			};			

			var grayscaleImgData= grayscale(data);
			
			var cycleArr=[fireKeySignal,directionKeySignal,feelingPleasure?100:0,feelingPain?100:0,eyePos.x/viewWidth*100, eyePos.y/viewHeight*100]
			cycleArr = cycleArr.concat(grayscaleImgData);

			var res=ihtai.cycle(cycleArr, td);

			if(res.memorizerOutput != null){
				//read res keypad signals, and trigger keyboard events per signal output
				fireKeySignal=res.memorizerOutput[0];
				directionKeySignal=res.memorizerOutput[1];
	    		if(fireKeySignal > 50){
	    			//fire key pressed
					var e = jQuery.Event("keydown");
					e.which = 32; // # Some key code value
					$(window).trigger(e);
	    		}

	    		if(directionKeySignal < 25){
	    			//up key pressed
					var e = jQuery.Event("keydown");
					e.which = 38; // # Some key code value
					$(window).trigger(e);	    			
	    		}
	    		else if(directionKeySignal <50){
	    			//left key pressed
					var e = jQuery.Event("keydown");
					e.which = 37; // # Some key code value
					$(window).trigger(e);	    			
	    		}else if(directionKeySignal <75){
	    			//right key pressed
					var e = jQuery.Event("keydown");
					e.which = 39; // # Some key code value
					$(window).trigger(e);	    			
	    		}
	    		else{
	    			//no key pressed
	    		}

				console.log('memory');
			}
			else{
				//TODO:act on instinct, which in this case is random keypad signals.
				//Trigger keyborad events based on instinct
		    	if(res.reflexOutput && res.reflexOutput.length==2){
		    		fireKeySignal=res.reflexOutput[0].signal[0];
		    		directionKeySignal=res.reflexOutput[1].signal[0];
		    		if(fireKeySignal > 50){
		    			//fire key pressed
						var e = jQuery.Event("keydown");
						e.which = 32; // # Some key code value
						$(window).trigger(e);
		    		}

		    		if(directionKeySignal < 25){
		    			//up key pressed
						var e = jQuery.Event("keydown");
						e.which = 38; // # Some key code value
						$(window).trigger(e);	    			
		    		}
		    		else if(directionKeySignal <50){
		    			//left key pressed
						var e = jQuery.Event("keydown");
						e.which = 37; // # Some key code value
						$(window).trigger(e);	    			
		    		}else if(directionKeySignal <75){
		    			//right key pressed
						var e = jQuery.Event("keydown");
						e.which = 39; // # Some key code value
						$(window).trigger(e);	    			
		    		}
		    		else{
		    			//no key pressed
		    		}
		    		console.log('reflexes')
		    	}  			
			}


	    	//eyePos x memorizer index=4, eyePos y memorizer index=5
	    	//bug eyepos sticks
			function setEyePos(prevBrightness){
				if(res.memorizerOutput != null){
					eyePos.x=res.memorizerOutput[4]/100*viewWidth;
					eyePos.y=res.memorizerOutput[5]/100*viewHeight;
				}
				else{
					if(prevBrightness > 20){
						//enter fixate mode: decrease random range of next eye pos by 50%
						eyePos.x=eyePos.x + (Math.random()*viewWidth)/16 - viewWidth/32;
						eyePos.y=eyePos.y + (Math.random()*viewHeight)/16 - viewHeight/32;			
					}
					else{
						eyePos.x=eyePos.x + Math.random()*viewWidth - viewWidth/2;
						eyePos.y=eyePos.y + Math.random()*viewHeight - viewHeight/2;
					}
				}
				//constrain within bitmap
				if(eyePos.x < 0)
					eyePos.x=0;
				if(eyePos.x + focusWidth > viewWidth)
					eyePos.x = viewWidth - focusWidth;

				if(eyePos.y < 0)
					eyePos.y=0;
				if(eyePos.y + focusHeight > viewHeight)
					eyePos.y = viewHeight - focusHeight;		
				eyePos.x=Math.floor(eyePos.x);
				eyePos.y=Math.floor(eyePos.y);

				return eyePos;
			}
			eyePos = setEyePos(prevBrightness);	   	
			//console.log('eyepos'+ eyePos.x+', '+eyePos.y)
		
			feelingPleasure=false;feelingPain=false;
		}
	}

	$("#saveBtn").click(function(e){
		var jsonString=ihtai.toJsonString('IhtaiDemo');
		download(new Blob([jsonString]), "ihtaiSave.json", "text/plain");
	});	
});