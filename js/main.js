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
			restitution: 0.2,
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
						restitution:0.5,
						name:'square'
					}));
			}
			else{
				// there is a body under mouse position, let's remove it
				world.removeBody(body);
			} 
		})	  

	    ///////// init Ihtai /////////////
		var drive={
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

				//console.log(this.hunger);
				$('#hunger').html("hunger: "+Math.floor(this.hunger));	
				return this.hunger;
			},
			targetValue:0
		};
		drives=[drive];

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
			clusterCount:1000,
			vectorDim:4,
			memoryHeight:100,
			drivesList:drives,
			reflexList:reflexes,
			acceptableRange:80
		});
	    /////////////////////////////////
	    var moveVel=0;
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
	    	if(newAngle){
	    		//circle.state.vel.set(Math.cos(newAngle)*moveVel, Math.sin(newAngle)*moveVel);
				circle.state.pos.set(circle.state.pos.x+Math.cos(newAngle)*moveVel, circle.state.pos.y+Math.sin(newAngle)*moveVel);
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

	    	if(res.memorizerOutput != null){
	    			if(res.memorizerOutput[0]>50){ //has a pellet been detected?
	    				moveVel=res.memorizerOutput[2]/100;
	    			}
	    			else{
	    				moveVel=0;
	    			}
	    	}
	    	else{
		    	if(ihtai.areReflexesEnabled()){
			    	if(res.reflexOutput){
			    		if(res.reflexOutput.length==1){
			    			moveVel=res.reflexOutput[0].signal[0]/100;
			    		}
			    		else{
			    			moveVel=0;
			    		}
			    	}
		    	}	    		
	    	}

		});

		$("#turnOffBtn").click(function(e){
			var areTheyEnabled=ihtai.areReflexesEnabled();
			if(areTheyEnabled){
				ihtai.enableReflexes(false);
				$('#turnOffBtn').html('Enable Reflexes');
			}
			else{
				ihtai.enableReflexes(true);
				$('#turnOffBtn').html('Disable Reflexes');
			}
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