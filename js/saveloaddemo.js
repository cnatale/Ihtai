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
	var ihtai, ihtaiPaused=false;

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
			hunger:100,
			init:function(){
				return this.hunger;
			},
			cycle:function(stm, dt){
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
				return this.hunger;
			},
			targetval:0 //the goal value for hunger
		};
		var tiredDrive={
			tiredness:0,
			init:function(){
				return this.tiredness;
			},
			cycle:function(stm,dt){
				if(stm[2] <= 50){
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
				return this.tiredness;
			},
			targetval:0 //the goal value for hunger
		};
		drives=[hungerDrive, tiredDrive];

		var reflexes = [{
			init:function(){},
			matcher: function(stm){ /*move if pellet it detected*/
				if(stm[0]>=50)
					return true;
				else
					return false;
			}, 

			response: function(stm){
				return {
					indices:[2],
					signal:[100]
				}
			}
		},
		{
			init:function(){},
			matcher: function(stm){ /*dont' move if no pellet is detected*/
				if(stm[0]<50)
					return true;
				else
					return false;
			}, 
			response: function(stm){
				return {
					indices:[2],
					signal:[0]
				}
			}
		}];

	    ihtai = new Ihtai({
			clusterCount:10000,/*value of 100,000 seems to allow for memorizer to take over quickly*/
			vectorDim:6,/*number of iostm values + drives*/
			memoryHeight:500,/*how many steps ahead can ihtai look for an optimal stm trail?*/
			drivesList:drives,
			reflexList:reflexes,
			acceptableRange:1,/*acceptable range for optimal stm is in square dist*/
			backStimCt:0
		});
	    /////////////////////////////////
	    var moveVel=0, lastTime, sleepMode=false, isRavenous=false;
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

			    //test making ball always face square
		    	///////////////////
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
					normalizedDist=Math.round((dist/normalizer)*100);
				}
		    	//////////////////////
		    	var normalizedAngle;
		    	if(newAngle){
		    		normalizedAngle=Math.round(newAngle*(100/(2*Math.PI)));
		    	}
		    	var res=ihtai.cycle([square?100:0,normalizedAngle?normalizedAngle:0,moveVel,normalizedDist], td);
		    	//returns {reflexOutput:~, memorizerOutput:~}

		    	//use memorizer and reflex pellet recognition output to move circle 
		    	if(res.memorizerOutput != null && !isRavenous){
		    			if(res.memorizerOutput[0]>50 && Math.random() > .1){ //has a pellet been detected?
		    				moveVel=res.memorizerOutput[2];
		    				//sometimes the above value will not come back as 0 or 100 due to compression.
		    				//bracket signal to 0 or 100
		    				moveVel=Math.round(moveVel/100)*100;
		    			}
		    			else{
		    				moveVel=0;
		    			}
		    			console.log('memorizer');
		    	}
		    	else if(ihtai.areReflexesEnabled()){
			    	if(res.reflexOutput){
			    		if(res.reflexOutput.length==1){
			    			moveVel=res.reflexOutput[0].signal[0];
			    		}
			    		else{
			    			moveVel=0;
			    		}
			    		console.log('reflexes')
			    	}    		
		    	}
		    	else{
		    		moveVel=0;
		    	}

		    	//use tiredness to decide if circle should stop moving regardless of pellet recognition

		    	if (res.drivesOutput!=null){
		    		if(res.drivesOutput[1]==100){
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
		    	if(sleepMode){
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