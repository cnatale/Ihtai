// contents of main.js:
require.config({
    paths: {
        /*foo: 'libs/foo-1.1.3'*/
    },
    packages: [

    ]
});

var eyePos={x:0,y:0}, focusWidth=10, focusHeight=10;
require([], function(){
	//////////// Load File Functionality /////////////////
	if (window.File && window.FileReader && window.FileList && window.Blob) {
	  // Great success! All the File APIs are supported.
	} else {
	  alert('The File APIs are not fully supported in this browser.');
	}

    function handleFileSelect(evt) {
	    var files = evt.target.files; // FileList object
	    var file= files[0];
	    var reader = new FileReader();
	    reader.onload= 
	  	reader.onload=(function(theFile){
	    	//call runapp with the content passed as param
			return function(e) {
				var ihtaiJsonString=e.target.result;
				//runApp(res);

				//TODO: 
				//-remove any circles currently in scene. (maybe not necessary since we're just
				//replacing its brain?)
				//-associate ihtai variable with new ihtai instance created through json string
				
				//instantiate ihtai with loaded file
				ihtai= new Ihtai(ihtaiJsonString);
        	};
	  	})(file);

	  	reader.readAsText(file);
    }

    document.getElementById('files').addEventListener('change', handleFileSelect, false);
   
    //////////////////////////////////////////////////////



	var /*eyePos={x:0,y:0},*/ prevBrightness=0,/*focusWidth=3, focusHeight=3,*/ lastTime;
	var fireKeySignal=0, directionKeySignal=0;
    var viewWidth = /*window.innerWidth*/800;
    var viewHeight = /*window.innerHeight*/600;	
	var pleasureDrive={
		pleasure:0,
		init:function(){
			return this.pleasure;
		},
		cycle:function(stimuli, dt){
			//TODO: update pleasure on score increase, slowly decrement over time
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
					this.pleasure-= 1 * dt;
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
		pain:0,
		init:function(){
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
		matcher: function(stimuli){ /*randomly press fire button*/
			return true; //always return a potential random action
		}, 
		response: function(stimuli){
			return {
				indices:[0],
				signal:[Math.random()*100]
			}
		}
	},
	{
		matcher: function(stimuli){ /*randomly select an arrow key*/
			return true; //always return a potential random action
		}, 
		response: function(stimuli){
			return {
				indices:[1],
				signal:[Math.random()*100]
			}
		}
	}];

    ihtai = new Ihtai({
		clusterCount:100000,/*value of 100,000 seems to allow for memorizer to take over quickly*/
		vectorDim:8+(focusWidth*focusHeight)/*108*/,/*number of iostimuli values + drives*/
		memoryHeight:1000,/*how many steps ahead can ihtai look for an optimal stimuli trail?*/
		drivesList:drives,
		reflexList:reflexes,
		acceptableRange:1200,/*600*//*acceptable range for optimal stimuli is in square dist*/
		backStimCt:1
	});		


	//TODO: add asteroids
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
		    	d[i]     = 255//*avg*/; // red
		    	d[i + 1] = 0/*255*//*avg*/; // green
		    	d[i + 2] = 0/*255*//*avg*/; // blue
		    	d[i + 3] = 255;
		    	//if(avg>1){debugger;}
		    	output.push(avg/2.55); //the 2.55 is a normalizer to scale 0-255 to 0-100
		    	ctr++;
		    	sum+=avg;
		    }
		    ctx.putImageData(imageData, eyePos.x, eyePos.y);
		    prevBrightness = sum/ctr;
		    //console.log(prevBrightness);
		    return output;
		};			

		var grayscaleImgData= grayscale(data);

		//TODO:calculate td
		//TODO:assemble cycleArr with:
		//pleasureVal, painVal, lastDirectionKeypress, lastSpacebarKeyPress,image data
		var cycleArr=[fireKeySignal,directionKeySignal,feelingPleasure?100:0,feelingPain?100:0,eyePos.x/viewWidth*100, eyePos.y/viewHeight*100]
		cycleArr = cycleArr.concat(grayscaleImgData);
		var res=ihtai.cycle(cycleArr, td);

		if(res.memorizerOutput != null){
			//read res keypad signals, and trigger keyboard events per signal output
			fireKeySignal=res.memorizerOutput[0];
			directionKeySignal=res.memorizerOutput[1];
    		if(fireKeySignal > 50){
    			//fire key pressed
    			//debugger;
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
	    		directionKeySignal=res.reflexOutput[0].signal[0];
	    		if(fireKeySignal > 50){
	    			//fire key pressed
	    			//debugger;
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
				/*if(prevBrightness > 20){
					//enter fixate mode: decrease random range of next eye pos by 50%
					eyePos.x=eyePos.x + (Math.random()*viewWidth)/8 - viewWidth/16;
					eyePos.y=eyePos.y + (Math.random()*viewHeight)/8 - viewHeight/16;			
				}
				else{*/
					eyePos.x=eyePos.x + Math.random()*viewWidth - viewWidth/2;
					eyePos.y=eyePos.y + Math.random()*viewHeight - viewHeight/2;
				//}
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

	
		feelingPleasure=false;feelingPain=false;

	}

	$("#saveBtn").click(function(e){
		var jsonString=ihtai.toJsonString('IhtaiDemo');
		download(new Blob([jsonString]), "ihtaiSave.json", "text/plain");
	});	
});