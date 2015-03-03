// contents of main.js:
require.config({
    paths: {
        /*foo: 'libs/foo-1.1.3'*/
    },
    packages: [

    ]
});

require([], function(){
	var pleasureDrive={
		pleasure:100,
		init:function(){
			return this.pleasure;
		},
		cycle:function(stimuli, dt){
			//TODO: update pleasure on score increase, slowly decrement over time
			if(stimuli[0] > 50){
				if(this.pleasure<100){
					this.pleasure+= .01 * dt;
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
			$("#pleasure").html("hunger: "+Math.floor(this.pleasure));	
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
			if(stimuli[1] > 50){
				this.pain+= 100 * dt;
			}
			else{
				this.pain-= .01 * dt;
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
		clusterCount:80000,/*value of 100,000 seems to allow for memorizer to take over quickly*/
		vectorDim:15/*108*/,/*number of iostimuli values + drives*/
		memoryHeight:800,/*how many steps ahead can ihtai look for an optimal stimuli trail?*/
		drivesList:drives,
		reflexList:reflexes,
		acceptableRange:600,/*600*//*acceptable range for optimal stimuli is in square dist*/
		backStimCt:1
	});		


	//TODO: add asteroids
	var intervalID = window.setInterval(updateIhtai, 33);


	/*
	TODO: add listeners for up, left, right char codes, space bar
	When a key is detected, set associated signal to correct state for that cycle.
	Remember to turn off again after said cycle.

	JavaScript key codes:
	http://www.cambiaresearch.com/articles/15/javascript-char-codes-key-codes

	TODO: Edit Asteroids code so that it publishes events when score increases and
	player loses a life. Add subscribers here for each. When either is detected, 
	set associated signal to correct state for that cycle. Remember to turn off again
	after said cycle.
	*/

	function updateIhtai(){
		/*
		signal 0: score increase (less than 50 means no, over 50 means yes)
		signal 1: death (less than 50 means no death, over 50 means death)
		signal 2: joystick (either left, up down by splitting 0-100 signal in thirds)
		signal 3: fire button (space bar, less than...)
		remaining signals: grayscale image data 
		*/



	}
});