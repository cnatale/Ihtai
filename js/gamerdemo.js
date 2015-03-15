// contents of main.js:
require.config({
    paths: {
        /*foo: 'libs/foo-1.1.3'*/
    },
    packages: [

    ]
});

var eyePos={x:0,y:0}, focusWidth=9, focusHeight=7, ihtaiPaused=false;
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
    var prevGrayscaleImgData=[];
    for(var i=0;i<focusWidth*focusHeight;i++){
    	prevGrayscaleImgData[i]=0;
    }
	var prevBrightness=0, lastTime, lastKeypress=0;
	var fireKeySignal=0, directionKeySignal=0;
    var viewWidth = /*800*/320;
    var viewHeight = /*600*/240;	

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
					this.pleasure-= .01 * dt;
				}
				else
					this.pleasure=0;				
			}

			//clamp vals
			this.pleasure=Math.min(this.pleasure, 100);
			this.pleasure=Math.max(this.pleasure, 0);
			$("#pleasure").html("pleasure: "+Math.floor(this.pleasure));	
			return this.pleasure;
		},
		targetval:100 //the goal value for pleasure
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
				this.pain-= .01 * dt;
			}

			//clamp vals
			this.pain=Math.min(this.pain, 100);
			this.pain=Math.max(this.pain, 0);
			$("#pain").html("pain: "+Math.floor(this.pain));	
			return this.pain;
		},
		targetval:0 //the goal value for pain
	};
	var curiosityDrive={
		init:function(){
			this.curiosity=100;
			this.px=0;
			this.py=0;
			return this.curiosity;
		},
		cycle:function(stimuli,dt){
			this.curiosity+= .01 * dt

			if(stimuli[4]!=this.px && stimuli[5]!=this.py){
				this.curiosity-=100 * dt * .04;
			}
			//curiosity is decreased when different images are seen from frame to frame
			this.curiosity-=stimuli[6] * dt * .1;

			//clamp vals
			this.curiosity=Math.min(this.curiosity, 100);
			this.curiosity=Math.max(this.curiosity, 0);
			$("#curiosity").html("curiosity: "+Math.floor(this.curiosity));	
			this.px = stimuli[4];
			this.py = stimuli[5];
			return this.curiosity;
		},
		targetval:0 //the goal value for pain
	};	
	var aggressionDrive={
		init:function(){
			this.aggression=100;
			return this.aggression;
		},
		cycle:function(stimuli,dt){
			this.aggression+= .01 * dt;

			//ship fired a shot
			if(stimuli[0] > 50)
				this.aggression-=stimuli[0] * dt * .001;

			//clamp vals
			this.aggression=Math.min(this.aggression, 100);
			this.aggression=Math.max(this.aggression, 0);
			$("#aggression").html("aggression: "+Math.floor(this.aggression));	
			return this.aggression;
		},
		targetval:0 //the goal value for pain
	};		
	drives=[pleasureDrive, painDrive, curiosityDrive, aggressionDrive];


	var reflexes = [{
		init:function(){
		    this.weightedFire=[];
		    for(var i=0;i<100;i++){
		    	this.weightedFire[i]=IhtaiUtils.weightedRand({0:.5, 100:.5});
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
		    	this.weightedDirection[i]=IhtaiUtils.weightedRand({15:0.25, 35:0.25, 60:0.25, 85:.25});
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

	//[fireKeySignal,directionKeySignal,feelingPleasure?100:0,feelingPain?100:0,eyePos.x/viewWidth*100, eyePos.y/viewHeight*100, imgDiff]
	var distributionArr=[{0:.5, 100:.5}, 
						{15:.25, 35:.25, 65:.25, 85:.25},
						{0:.5, 100:.5},
						{0:.5, 100:.5},
						{0:.1, 10:.1, 20:.1, 30:.1, 40:.1, 60:.1, 70:.1, 80:.1, 90:.1, 100:.1},
						{0:.1, 10:.1, 20:.1, 30:.1, 40:.1, 60:.1, 70:.1, 80:.1, 90:.1, 100:.1},
						{0:.1, 10:.1, 20:.1, 30:.1, 40:.1, 60:.1, 70:.1, 80:.1, 90:.1, 100:.1}];
	//bitmap greyscales+ drives
	for(var i=0;i<focusWidth*focusHeight+4;i++){
		distributionArr.push({0:.1, 10:.1, 20:.1, 30:.1, 40:.1, 60:.1, 70:.1, 80:.1, 90:.1, 100:.1});
	}
	

    ihtai = new Ihtai({
		clusterCount:100000,/*value of 100,000 seems to allow for memorizer to take over quickly*/
		vectorDim:11+(focusWidth*focusHeight)/*108*/,/*number of iostimuli values + drives*/
		memoryHeight:500,/*how many steps ahead can ihtai look for an optimal stimuli trail?*/
		drivesList:drives,
		reflexList:reflexes,
		acceptableRange:600,/*600*//*acceptable range for optimal stimuli is in square dist*/
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

	function updateIhtai(){
		if(!ihtaiPaused){
			if(shouldOpenFile){
				ihtaiPaused=true;
				openFile();
				shouldOpenFile=false;	
				return;	
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
			    	var gray=d[i+3];
			    	//d[i]     = 255; // red
			    	//d[i + 1] = 0; // green
			    	d[i + 2] = 255; // blue
			    	d[i + 3] = 255;
			    	output.push(gray/2.55); //the 2.55 is a normalizer to scale 0-255 to 0-100
			    	ctr++;
			    	sum+=gray;
			    }
			    ctx.putImageData(imageData, eyePos.x, eyePos.y);
			    prevBrightness = sum/ctr; //avg brightness for this bitmap chunk
			    //console.log(prevBrightness);
			    return output;
			};			

			var grayscaleImgData= grayscale(data);
			/*compare curr grayscale data w/ grayscale data from last iteration*/	
			var imgDiff=0;
			for(var i=0;i<grayscaleImgData.length;i++){
				imgDiff+=Math.abs(grayscaleImgData[i]-prevGrayscaleImgData[i]);
			}		
			imgDiff=imgDiff/grayscaleImgData.length; //the average difference value
			prevGrayscaleImgData=grayscaleImgData;
			
			//TODO: associating pleasure with score increase may be a mistake. investigate.
			var cycleArr=[fireKeySignal,directionKeySignal,feelingPleasure?100:0,feelingPain?100:0,eyePos.x/viewWidth*100, eyePos.y/viewHeight*100, imgDiff]
			cycleArr = cycleArr.concat(grayscaleImgData);

			var res=ihtai.cycle(cycleArr, td);
			lastKeypress +=td;
			if(res.memorizerOutput != null && lastKeypress > 100 && ihtai.getProperties().driveList[3].aggression<100/*keep from triggering stimuli loop*/){
				//read res keypad signals, and trigger keyboard events per signal output
				fireKeySignal=res.memorizerOutput[0];
				directionKeySignal=res.memorizerOutput[1];
	    		if(fireKeySignal > 50 && Math.random() > .5){
	    			//fire key pressed
					var e = jQuery.Event("keydown");
					e.which = 32; // # Some key code value
					$(window).trigger(e);
					//console.log('should trigger fire')
	    		}
	    		else{
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
		    	}

				console.log('memory');
				lastKeypress=0;
			}
			else{
				//TODO:act on instinct, which in this case is random keypad signals.
				//Trigger keyborad events based on instinct
		    	if(res.reflexOutput && res.reflexOutput.length==2 && lastKeypress > 100){
		    		fireKeySignal=res.reflexOutput[0].signal[0];
		    		directionKeySignal=res.reflexOutput[1].signal[0];
		    		if(fireKeySignal > 50 && Math.random() > .5){
						var e = jQuery.Event("keydown");
						e.which = 32; // # Some key code value
						$(window).trigger(e);
						//console.log('should trigger fire')
		    		}
		    		else{
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
		    		}
		    		console.log('reflexes')
		    		lastKeypress=0;
		    	}  			
			}


	    	//eyePos x memorizer index=4, eyePos y memorizer index=5
	    	//bug eyepos sticks
			function setEyePos(prevBrightness){
				/*
				TODO: eyepos still gets stuck at a particular coordinate. Due to rounding?
				*/
				var px=eyePos.x, py=eyePos.y;
				if(res.memorizerOutput != null && ihtai.getProperties().driveList[2].curiosity<100){
					eyePos.x=Math.floor(res.memorizerOutput[4]/100*viewWidth);
					eyePos.y=Math.floor(res.memorizerOutput[5]/100*viewHeight);
					/*while(eyePos.x==px && eyePos.y==py){
						if(prevBrightness > 20){
							//enter fixate mode: decrease random range of next eye pos by 50%
							eyePos.x=eyePos.x + (Math.random()*viewWidth)/16 - viewWidth/32;
							eyePos.y=eyePos.y + (Math.random()*viewHeight)/16 - viewHeight/32;			
						}
						else{
							eyePos.x=Math.floor(Math.random()*viewWidth);
							eyePos.y=Math.floor(Math.random()*viewHeight);
						}						
					}*/
				}
				else{
					eyePos.x= Math.floor(Math.random()*viewWidth);
					eyePos.y= Math.floor(Math.random()*viewHeight);
					/*while(eyePos.x==px && eyePos.y==py){
						eyePos.x= Math.floor(Math.random()*viewWidth);
						eyePos.y= Math.floor(Math.random()*viewHeight);
					}*/
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
			}
			setEyePos(prevBrightness);	   	
			//console.log('eyepos'+ eyePos.x+', '+eyePos.y)
		
			feelingPleasure=false;feelingPain=false;
		}
	}

	$("#saveBtn").click(function(e){
		var jsonString=ihtai.toJsonString('IhtaiDemo');
		download(new Blob([jsonString]), "ihtaiSave.json", "text/plain");
	});	
});