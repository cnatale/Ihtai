// contents of main.js:
require.config({
    paths: {
        /*foo: 'libs/foo-1.1.3'*/
    },
    packages: [

    ]
});

require([], function(){
	//application starting point
	var ihtai;

	//////////// Load File Functionality /////////////////
	if (window.File && window.FileReader && window.FileList && window.Blob) {
	  // Great success! All the File APIs are supported.
	} else {
	  alert('The File APIs are not fully supported in this browser.');
	}


    ///////// init Ihtai /////////////
    //add tiredness drive, add behavior that when tiredness=100, stop moving (to 'seed'
   	// conservation of motion).
	var hungerDrive={
		hunger:100,
		init:function(){
			return this.hunger;
		},
		cycle:function(stimuli){
			if(stimuli[3] < 10){
				if(this.hunger>0){
					this.hunger--;
				}
				else
					this.hunger=0;
			}
			else
				if(this.hunger<100){
					this.hunger+=.1;
				}
				else{
					this.hunger=100;
				}

			
			$("#hunger").html("hunger: "+Math.floor(this.hunger));	
			return this.hunger;
		},
		targetValue:0 //the goal value for hunger
	};
	var tiredDrive={
		tiredness:0,
		init:function(){
			return this.tiredness;
		},
		cycle:function(stimuli){
			if(stimuli[2] <= 50){
				if(this.tiredness>0){
					this.tiredness-=.1;
				}
				else
					this.tiredness=0;
			}
			else
				if(this.tiredness<100){
					this.tiredness+=.1;
				}
				else{
					this.tiredness=100;
				}

			$("#tiredness").html("tiredness: "+Math.floor(this.tiredness));	
			return this.tiredness;
		},
		targetValue:0 //the goal value for hunger
	};
	drives=[hungerDrive, tiredDrive];

	var reflexes = [{
		matcher: function(stimuli){ /*move if pellet it detected*/
			if(stimuli[0]>=50)
				return true;
			else
				return false;
		}, 
		response: function(stimuli){
			return {
				indices:[2],
				signal:[100]
			}
		}
	},
	{
		matcher: function(stimuli){ /*dont' move if no pellet is detected*/
			if(stimuli[0]<50)
				return true;
			else
				return false;
		}, 
		response: function(stimuli){
			return {
				indices:[2],
				signal:[0]
			}
		}
	}];

    ihtai = new Ihtai({
		clusterCount:100000,/*value of 100,000 seems to allow for memorizer to take over quickly*/
		vectorDim:6,/*number of iostimuli values + drives*/
		memoryHeight:1000,/*how many steps ahead can ihtai look for an optimal stimuli trail?*/
		drivesList:drives,
		reflexList:reflexes,
		acceptableRange:600/*acceptable range for optimal stimuli is in square dist*/
	});
    /////////////////////////////////

    //var res=ihtai.cycle([square?100:0,normalizedAngle?normalizedAngle:0,moveVel,normalizedDist]);
    	//returns {reflexOutput:~, memorizerOutput:~}

    //////////// image transformations /////////////////////
    // from http://www.html5rocks.com/en/tutorials/canvas/imagefilters/
	Filters = {};
	Filters.getPixels = function(img) {
		var c = this.getCanvas(img.width, img.height);
		var ctx = c.getContext('2d');
		ctx.drawImage(img);
		return ctx.getImageData(0,0,c.width,c.height);
	};

	Filters.getCanvas = function(w,h) {
		var c = document.createElement('canvas');
		c.width = w;
		c.height = h;
		return c;
	};

	Filters.filterImage = function(filter, image, var_args) {
		var args = [this.getPixels(image)];
		for (var i=2; i<arguments.length; i++) {
	    	args.push(arguments[i]);
		}
		return filter.apply(null, args);
	};

    Filters.grayscale = function(pixels, args) {
		var d = pixels.data, output=[];
		for (var i=0; i<d.length; i+=4) {
	    	var r = d[i];
	    	var g = d[i+1];
	    	var b = d[i+2];
	   		// CIE luminance for the RGB
	    	// The human eye is bad at seeing red and blue, so we de-emphasize them.
	    	//var v = 0.2126*r + 0.7152*g + 0.0722*b;
	    	var v = (r + g + b)/3; //trying a simpler approach first
	    	output.push(v);
	  	}
		return output;
	};


    /////////////// ui /////////////////////////

	$("#saveBtn").click(function(e){
		var jsonString=ihtai.toJsonString('IhtaiDemo');
		download(new Blob([jsonString]), "ihtaiSave.json", "text/plain");
	});
	$("#turnOffMemBtn").click(function(e){
		var areTheyEnabled=ihtai.areMemoriesEnabled();
		if(areTheyEnabled){
			ihtai.enableMemories(false);
			$('#turnOffMemBtn').html('Enable Memories');
		}
		else{
			ihtai.enableMemories(true);
			$('#turnOffMemBtn').html('Disable Memories');
		}			
	});


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

				/*TODO: 
				-remove any circles currently in scene. (maybe not necessary since we're just
				replacing its brain?)
				-associate ihtai variable with new ihtai instance created through json string
				*/
				//instantiate ihtai with loaded file
				ihtai= new Ihtai(ihtaiJsonString);
        	};
	  	})(file);

	  	reader.readAsText(file);
    }

    document.getElementById('files').addEventListener('change', handleFileSelect, false);
    //////////////////////////////////////////////////////


	});


});