require.config({
    paths: {
        /*foo: 'libs/foo-1.1.3'*/
    },
    packages: [
        {
          name: 'physicsjs',
          location: 'external/physicsjs',
          main: 'physicsjs-full'
        }
    ]

});

require(['physicsjs'], function(Physics){
	//application starting point
	var ihtai, ihtaiPaused=false, firstCycle=true;
	var moveVel=0, lastTime, sleepMode=false, isRavenous=false, zeroMoveCtr=0;	

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
				ihtai=null;
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



	Physics(function(world){
	    var viewWidth = /*window.innerWidth*/640;
	    var viewHeight = /*window.innerHeight*/480;

	    var renderer = Physics.renderer('canvas', {
		    el: 'viewport',
		    width: viewWidth,
		    height: viewHeight,
		    meta: false/*, // don't display meta data
		    styles: {
		        // set colors for the circle bodies
		        'circle' : {
		            strokeStyle: '#351024',
		            lineWidth: 1,
		            fillStyle: '#d33682',
		            angleIndicator: '#351024'
		        },
		        'convex-polygon': {
		        	fillStyle: '#cccc00',
		        	angleIndicator: '#351024'
		        }
		    }*/
		});

		// add the renderer
		world.add(renderer);
		// render on each step
		world.on('step', function(){
			world.render();
		});

		// bounds of the window
		var viewportBounds = Physics.aabb(0, 0, viewWidth, viewHeight);

		// constrain objects to these bounds
		var edgeBounce = Physics.behavior('edge-collision-detection', {
			aabb: viewportBounds,
			restitution: .25, //turn on bouncy physics
			cof: .4
		});

		// constrain objects to these bounds
		world.add(edgeBounce);

		// enabling collision detection among bodies
		world.add(Physics.behavior("body-collision-detection"));	  
		world.add(Physics.behavior("sweep-prune"));
		// ensure objects bounce when edge collision is detected
		world.add( Physics.behavior('body-impulse-response') );
		// add some gravity
		world.add( Physics.behavior('constant-acceleration') );		

		var circle=Physics.body('circle', {
		        x: 50, // x-coordinate
		        y: viewHeight, // y-coordinate
		        vx: 0, // velocity in x-direction
		        vy: 0, // velocity in y-direction
		        radius: 20,
		        name:'circle'
		});

		// add a circle
		world.add(circle);

	    $("#viewport").click(function(e){
	     	// checking canvas coordinates for the mouse click
			var offset = $(this).offset();
			var px = e.pageX - offset.left;
				var py = e.pageY - offset.top;
				// this is the way physicsjs handles 2d vectors, similar at Box2D's b2Vec
			var mousePos = Physics.vector();
				mousePos.set(px,py);
				// finding a body under mouse position
				var body = world.findOne({
				$at: mousePos
			})
			// there isn't any body under mouse position, going to create a new box
			if(!body){
		     	world.add(Physics.body("convex-polygon",{
						x: px,
						y: py,
						vertices: [
							{x:0, y:0},
							{x:0, y:60},
							{x:60, y:60},
							{x:60, y:0}

						],
						restitution:.25,
						name:'square'
					}));
			}
			else{
				// there is a body under mouse position, let's remove it
				world.removeBody(body);
			} 
		})	
		function dropBox(){
	    	//get a square if one exists
	    	queryFn = Physics.query({
	    		name:'square'
	    	});
	    	var square=world.findOne(queryFn), newAngle;
	    	if(square){
	    		world.remove(square);
	    	}

	     	world.add(Physics.body("convex-polygon",{
					x: Math.random()*viewWidth,
					y: 0,
					vertices: [
						{x:0, y:0},
						{x:0, y:60},
						{x:60, y:60},
						{x:60, y:0}

					],
					restitution:.25,
					name:'square'
				}));	
			window.setTimeout(dropBox, 60000+ Math.random()*30000);	
		}  

		dropBox();
		//window.setTimeout(dropBox, Math.random()*30000);

	    ///////// init Ihtai /////////////
	    // add tiredness drive, add behavior that when tiredness=100, stop moving (to 'seed'
	   	// conservation of motion).
		var hungerDrive={
			hunger:100, prevHunger:0,
			init:function(){
				return this.hunger;
			},
			cycle:function(stm, dt){
				this.prevHunger=this.hunger;
				if(stm[3] < 10){
					if(this.hunger>0){
						this.hunger-= .01 * dt;
					}
					else
						this.hunger=0;
				}
				else{
					if(this.hunger<100){
						this.hunger+= .01 * dt;
					}
					else{
						this.hunger=100;
					}
				}

				//clamp vals
				this.hunger=Math.min(this.hunger, 100);
				this.hunger=Math.max(this.hunger, 0);
				//this.hunger=Math.round(this.hunger);
				$("#hunger").html("hunger: "+Math.floor(this.hunger));	
				return Math.round(this.hunger);
			},
			undo:function(){
				this.hunger=this.prevHunger;
				return Math.round(this.hunger);
			},
			targetval:0 //the goal value for hunger
		};
		var tiredDrive={
			tiredness:0, prevTiredness:0,
			init:function(){
				return this.tiredness;
			},
			cycle:function(stm,dt){
				this.prevTiredness=this.tiredness;
				if(moveVel <= 50 || sleepMode){
					if(this.tiredness>0){
						this.tiredness-= .01 * dt;
					}
					else
						this.tiredness=0;
				}
				else{
					if(this.tiredness<100){
						this.tiredness+= .01 * dt;
					}
					else{
						this.tiredness=100;
					}
				}

				//clamp vals
				this.tiredness=Math.min(this.tiredness, 100);
				this.tiredness=Math.max(this.tiredness, 0);
				//this.tiredness=Math.round(this.tiredness);
				$("#tiredness").html("tiredness: "+Math.floor(this.tiredness));
				return Math.round(this.tiredness);
			},
			undo:function(){
				this.tiredness=this.prevTiredness;
				return Math.round(this.tiredness);
			},
			targetval:0 //the goal value for hunger
		};
		drives=[hungerDrive, tiredDrive];

		var reflexes = [];

	    ihtai = new Ihtai({
			clusterCount:5000,
			vectorDim:6,/*number of iostm values + drives*/
			memoryHeight:500,/*how many steps ahead can ihtai look for an optimal stm trail?*/
			drivesList:drives,
			reflexList:reflexes,
			acceptableRange:9999,/*acceptable range for optimal stm is in square dist*/
			backStimCt:0,
			distanceAlgo:"avg" /*avg or endState*/
		});


		// subscribe to ticker to advance the simulation
		Physics.util.ticker.on(function( time, dt ){
			if(!ihtaiPaused){
				if(shouldOpenFile){
					ihtaiPaused=true;
					openFile();
					shouldOpenFile=false;	
					return;	
				}

			    world.step( time );
			    world.wakeUpAll();

		    	//get the circle
		    	var queryFn = Physics.query({
		    		name:'circle'
		    	});
		    	var circle=world.findOne(queryFn);

		    	//get a square if one exists
		    	queryFn = Physics.query({
		    		name:'square'
		    	});
		    	var square=world.findOne(queryFn), newAngle;

		    	if(circle && square){
				    var scratch = Physics.scratchpad();
				    // assuming your viewport is the whole screen
				    var circlePos = scratch.vector().set(circle.state.pos.x, circle.state.pos.y); 
				    circlePos.vsub( square.state.pos ); // get vector pointing towards square

					// get angle with respect to x axis
				    newAngle = circlePos.angle(); 
					scratch.done();	
				    circle.state.angular.vel=0;
				    circle.state.angular.acc=0;
	  				newAngle+=Math.PI;
				    circle.state.angular.pos = newAngle;
		    	}
		    	//move circle
		    	var dist, normalizedDist=100;
		    	var normalizer = Math.sqrt(viewHeight*viewHeight + viewWidth*viewWidth);
		    	var td;
		    	if(lastTime)
		    		td=time-lastTime;
		    	else
		    		td=0;
		    	lastTime=time;

		    	if(newAngle){
		    		//todo:instead of dividing td by a constant, change the moveVel denom. constant
		    		var mx=(circle.state.acc.x+Math.cos(newAngle)*((td/200)*(moveVel/1000)));
		    		var my=(circle.state.acc.y+Math.sin(newAngle)*((td/200)*(moveVel/1000)));				
					circle.state.acc.set(mx,my);
					dist=circle.state.pos.dist(square.state.pos);
					normalizedDist=(dist/normalizer)*100;
				}
				else{
					moveVel=0;
				}
		    	//////////////////////
		    	var normalizedAngle;
		    	if(newAngle){
		    		normalizedAngle=newAngle*(100/(2*Math.PI));
		    	}

				var inputStm=[square?100:0,normalizedAngle?Math.round(normalizedAngle):0,Math.round(moveVel),Math.round(normalizedDist)];
		    	var res;
		    	if(Math.random() > 1 || firstCycle){
		    		res=ihtai.cycle(inputStm, td);
		    		firstCycle=false;
		    	}
		    	else{
		    		res=ihtai.daydream(inputStm, td, [2]);
		    	}
		    	//returns {reflexOutput:~, memorizerOutput:~}
		
		    	//use memorizer and reflex pellet recognition output to move circle 

		    	/* TODO:change logic so that instead of acting on instinct randomly,
		    	   daydream and act on response */
		    	if(res.memorizerOutput[0] != null /*!isRavenous*/){
		    			if(res.memorizerOutput[0][0]>50){ //has a pellet been detected?
		    				moveVel=res.memorizerOutput[0][2];
		    				//sometimes the above value will not come back as 0 or 100 due to compression.
		    				//bracket signal to 0 or 100
		    				moveVel=Math.round(moveVel/100)*100;
		    			}
		    			else{
		    				moveVel=0;
		    			}
		    			console.log('memorizer');
		    	}
		    	else{
		    		console.log('reflex')
		    		//if(Math.random() > .1)
		    			moveVel=100;
		    		//else
		    		//	moveVel=0;
		    	}

		    	//use tiredness to decide if circle should stop moving regardless of pellet recognition
		    	if (res.drivesOutput!=null){    		
		    		if(res.drivesOutput[1]>=100){
		    			sleepMode=true;
		    		}
		    		if(res.drivesOutput[1]==0){ //circle has gotten enough sleep. wake it back up.
		    			sleepMode=false;
		    		}
		    		if(res.drivesOutput[0]==100){
		    			isRavenous=true;
		    		}
		    		if(res.drivesOutput[0]<=50){
		    			isRavenous=false;
		    		}
		    	}
		    	/*if(isRavenous)
		    		moveVel=100;
		    	*/	
		    	if(sleepMode){ //sleep comes before hunger
		    		moveVel=0;
		    	}
		    	
		    }
		});

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

		// start the ticker
		Physics.util.ticker.start();		
	});


});