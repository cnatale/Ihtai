// contents of main.js:
require.config({
    paths: {
        /*foo: 'libs/foo-1.1.3'*/
    },
    packages: [

    ]
});

var eyePos={x:0,y:0}, focusWidth=5, focusHeight=7, ihtaiPaused=false, SELECTION_INDEX=0, lastRandNum, lastTime;
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
    var i;
	var selectionSignal=0;

	var pleasureDrive={
		init:function(){
			this.pleasure=0;
			return this.pleasure;
		},
		cycle:function(stimuli, dt){
			//update pleasure on score increase, slowly decrement over time
			if(selectionSignal==lastRandNum)
				this.pleasure=1;
			else
				this.pleasure=0;

			//clamp vals
			$("#pleasure").html("pleasure: "+this.pleasure);	
			return this.pleasure;
		},
		targetval:1 //the goal value for pleasure
	};

	drives=[pleasureDrive];
	var reflexes = [];

	//combine fire key signal with arrow keys, since game can only detect one keypress per cycle
	var distributionArr=[//selection
						{0:.1, 1:.1, 2:.1, 3:.1, 4:.1, 5:.1, 6:.1, 7:.1, 8:.1, 9:.1}];
	//bitmap block b/w values
	for(var i=0;i<focusWidth*focusHeight;i++){
		distributionArr.push({0:.5,1:.5});
	}
	//drives
	distributionArr.push({0:.5, 1:.5});
	
    ihtai = new Ihtai({
		clusterCount:/*20480*/0,
		vectorDim:37,/*number of iostimuli values + drives*/
		memoryHeight:120,/*how many steps ahead can ihtai look for an optimal stimuli trail?*/
		drivesList:drives,
		reflexList:reflexes,
		acceptableRange:0,/*160000*//*acceptable range for optimal stimuli is in square dist*/
		bStmCt:0,
		distribution:distributionArr
	});		

	//var intervalID = window.setInterval(updateIhtai, 33);
	window.updateIhtai=updateIhtai;

	var feelingPleasure=false;

    //get canvas and context reference
  	var canvas = $("#canvas");    
	ctx= canvas[0].getContext("2d");


	//declare function variables here so they aren't instantiated every iteration, limiting gc
	var td, time, imageData, data, getPixels, grayscaleImgData, cycleArr, res, e, visLog;
	//grayscale function var declarations
	var output, row=0, col=0, eyePosRow=0, eyePosCol=0, pctX, pctY, i, gray;

	var img = new Image();
	img.src = 'img/numbers_sm.jpg';	
	img.onload = function() {
		//ctx.drawImage(img, -20, -8);
		//img.style.display = 'none';
		updateIhtai();
	};	
	var numCoords={
		1:{x:0,y:0},
		2:{x:-5,y:0},
		3:{x:-10,y:0},
		4:{x:-15,y:0},
		5:{x:-20,y:0},
		6:{x:0,y:-8},
		7:{x:-5,y:-8},
		8:{x:-10,y:-8},
		9:{x:-15,y:-8},
		0:{x:-20,y:-8}
	};
	var randNum, currImgCoords;

	$('#resetBtn').click(function(){
		updateIhtai();
	});
	

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

	    	//select random number img and draw it in canvas
	    	randNum=Math.round(Math.random()*9);
	    	currImgCoords=numCoords[randNum];
			ctx.drawImage(img, currImgCoords.x, currImgCoords.y);

			
			imageData = ctx.getImageData(0, 0, focusWidth, focusHeight);
			data=imageData.data;

			getPixels = function(d) {
				output=[];

			    for (i = 0; i < d.length; i += 4) {    	
			    	//d[i]     = 255; // red
			    	//d[i + 1] = 0; // green
			    	//d[i + 2] = 255; // blue
			    	//d[i + 3] = 255;
			    	o=d[i]/2.55//the 2.55 is a normalizer to scale 0-255 to 0-100
			    	output.push(o>.5?1:0); 
			    }
			};			

			getPixels(data);
 
			cycleArr=[selectionSignal];
			cycleArr=cycleArr.concat(output);

			res=ihtai.cycle(cycleArr, td);
			if(res.memorizerOutput != null /*&& Math.random() > .1*/ /*prevent overfitting*/){
				//read res keypad signals, and trigger keyboard events per signal output
				selectionSignal=res.memorizerOutput[SELECTION_INDEX];
				console.log('memory');
			}
			else{
				//TODO:act on instinct, which in this case is random selection
		    	selectionSignal=Math.round(Math.random()*9);	
		    	console.log('reflex');		
			}
			lastRandNum=randNum;
			$("#prediction").html("prediction: "+selectionSignal+', actual: '+ lastRandNum);	
			//debugger;
		}
	}

	$("#saveBtn").click(function(e){
		var jsonString=ihtai.toJsonString('IhtaiDemo');
		download(new Blob([jsonString]), "ihtaiSave.json", "text/plain");
	});	
});