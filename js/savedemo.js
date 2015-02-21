// contents of main.js:
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

	Physics(function(world){
	    var viewWidth = window.innerWidth;
	    var viewHeight = window.innerHeight;

	    var renderer = Physics.renderer('canvas', {
		    el: 'viewport',
		    width: viewWidth,
		    height: viewHeight,
		    meta: false, // don't display meta data
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
		    }
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
			restitution: .25,
			cof: .4
		});

		// constrain objects to these bounds
		world.add(edgeBounce);

		// resize events
		window.addEventListener('resize', function () {
	
			viewWidth = parent.innerWidth;
			viewHeight = parent.innerHeight;
	
			renderer.el.width = viewWidth;
			renderer.el.height = viewHeight;
	
			renderer.options.width = viewWidth;
			renderer.options.height = viewHeight;
	
			viewportBounds = Physics.aabb(0, 0, viewWidth, viewHeight);
			edgeBounce.setAABB(viewportBounds);
	
		}, true);

		// enabling collision detection among bodies
		world.add(Physics.behavior("body-collision-detection"));	  
		world.add(Physics.behavior("sweep-prune"));

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

		// ensure objects bounce when edge collision is detected
		world.add( Physics.behavior('body-impulse-response') );

		// add some gravity
		world.add( Physics.behavior('constant-acceleration') );

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

	    ///////// init Ihtai /////////////
	    //TODO:add tiredness drive, add behavior that when tiredness=100, stop moving (to 'seed'
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

				//console.log(this.hunger);
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

	    var ihtai = new Ihtai({
			clusterCount:1000,/*value of 100,000 seems to allow for memorizer to take over quickly*/
			vectorDim:6,/*number of iostimuli values + drives*/
			memoryHeight:1000,
			drivesList:drives,
			reflexList:reflexes,
			acceptableRange:600/*acceptable range is in square dist*/
		});
	    /////////////////////////////////
	    var moveVel=0, lastTime, sleepMode=false, isRavenous=false;
		// subscribe to ticker to advance the simulation
		Physics.util.ticker.on(function( time, dt ){
		    world.step( time );

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
			    circlePos.vsub( square.state.pos ); // get vector pointing towards mouse pos

			    newAngle = circlePos.angle(); // get angle with respect to x axis
				scratch.done();	
			    circle.state.angular.vel=0;
			    circle.state.angular.acc=0;
  				newAngle+=Math.PI;
  				var xDir=Math.cos(newAngle);
  				var yDir=Math.sin(newAngle);
			    circle.state.angular.pos = newAngle;
	    	}
	    	//move circle
	    	var dist, normalizedDist=100;
	    	var normalizer = Math.sqrt(window.innerHeight*window.innerHeight + window.innerWidth*window.innerWidth);
	    	var td;
	    	if(lastTime)
	    		td=time-lastTime;
	    	else
	    		td=0;
	    	lastTime=time;
	    	if(newAngle){
	    		//circle.state.vel.set(Math.cos(newAngle)*moveVel, Math.sin(newAngle)*moveVel);
	    		var mx=(circle.state.pos.x+Math.cos(newAngle)*(td*(moveVel/1000)));
	    		var my=(circle.state.pos.y+Math.sin(newAngle)*(td*(moveVel/1000)));
				circle.state.pos.set(mx, my);
				dist=circle.state.pos.dist(square.state.pos);
				normalizedDist=(dist/normalizer)*100;
			}
	    	//////////////////////
	    	var normalizedAngle;
	    	if(newAngle){
	    		normalizedAngle=newAngle*(100/(2*Math.PI));
	    	}
	    	var res=ihtai.cycle([square?100:0,normalizedAngle?normalizedAngle:0,moveVel,normalizedDist]);
	    	//returns {reflexOutput:~, memorizerOutput:~}

	    	//use memorizer and reflex pellet recognition output to move circle 
	    	if(res.memorizerOutput != null && !isRavenous){
	    			if(res.memorizerOutput[0]>50){ //has a pellet been detected?
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
	    	

		});

		$("#saveBtn").click(function(e){
			ihtai.saveFile('IhtaiDemo');
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
		$('canvas').prop({width: window.innerWidth, height: window.innerHeight});		
	});


});