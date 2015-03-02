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
	var ihtai, c, ctx, prevBrightness=0, eyePos={x:0,y:0}, prevEyePos={x:0,y:0}, focusWidth=3, focusHeight=3;

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
			cycle:function(stimuli, dt){
				if(stimuli[3] < 10){
					if(this.hunger>0){
						this.hunger-= .01 * dt;
					}
					else
						this.hunger=0;
				}
				else
					if(this.hunger<100){
						this.hunger+= .01 * dt;
					}
					else{
						this.hunger=100;
					}

				//clamp vals
				this.hunger=Math.min(this.hunger, 100);
				this.hunger=Math.max(this.hunger, 0);
				$("#hunger").html("hunger: "+Math.floor(this.hunger));	
				$("#avgHunger").html("avg hunger: "+Math.floor(ihtai.getProperties().drives.getAvgDriveValue()[0]));					
				return this.hunger;
			},
			targetValue:0 //the goal value for hunger
		};
		var tiredDrive={
			tiredness:0,
			init:function(){
				return this.tiredness;
			},
			cycle:function(stimuli, dt){
				if(stimuli[2] <= 50){
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
				$("#tiredness").html("tiredness: "+Math.floor(this.tiredness));	
				$("#avgTiredness").html("avg tired: "+Math.floor(ihtai.getProperties().drives.getAvgDriveValue()[1]));				
				return this.tiredness;
			},
			targetValue:0 //the goal value for tiredness
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
			clusterCount:10000,/*value of 100,000 seems to allow for memorizer to take over quickly*/
			vectorDim:11/*108*/,/*number of iostimuli values + drives*/
			memoryHeight:800,/*how many steps ahead can ihtai look for an optimal stimuli trail?*/
			drivesList:drives,
			reflexList:reflexes,
			acceptableRange:3000,/*600*//*acceptable range for optimal stimuli is in square dist*/
			backStimCt:1
		});		
	    /////////////////////////////////
	    //get canvas and context reference
    	c=document.getElementsByClassName(' pjs-layer-main');
    	ctx= c[0].getContext("2d");


	    var moveVel=0, lastTime, sleepMode=false, isRavenous=false;
		// subscribe to ticker to advance the simulation
		Physics.util.ticker.on(function( time, dt ){
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
				normalizedDist=(dist/normalizer)*100;
			}
	    	//////////////////////
	    	var normalizedAngle;
	    	if(newAngle){
	    		normalizedAngle=newAngle*(100/(2*Math.PI));
	    	}

	    	////////////////////// vision test /////////////////////
	    	/*
			pass in a X by Y grayscale bitmap as a X * Y dim vector in addition to other data.
	    	*/


			var imageData = ctx.getImageData(eyePos.x, eyePos.y, focusWidth, focusHeight);
			var data=imageData.data;

			var grayscale = function(d) {
				var output=[],ctr=0,sum=0;
			    for (var i = 0; i < d.length; i += 4) {
			    	var avg = (d[i] + d[i +1] + d[i +2]) / 3;
			    	d[i]     = 255/*avg*/; // red
			    	d[i + 1] = 255/*avg*/; // green
			    	d[i + 2] = 255/*avg*/; // blue
			    	d[i + 3] = 255;
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
			//canvas, ctx

			////////////////////////////////////////////////////////	    
			var cycleArr=[eyePos.x/viewWidth*100, eyePos.y/viewHeight*100];
			//var cycleArr=[square?100:0,normalizedAngle?normalizedAngle:0,moveVel,normalizedDist, eyePos.x/viewWidth*100, eyePos.y/viewHeight*100];
			cycleArr = cycleArr.concat(grayscaleImgData);
	    	var res=ihtai.cycle(cycleArr, td);
	    	//returns {reflexOutput:~, memorizerOutput:~}

	    	//use memorizer and reflex pellet recognition output to move circle 
	    	if(res.memorizerOutput != null && !isRavenous){
	    	//BUG: res.memorizerOutput[0] is falling below 0 when it shouldn't
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
	    	//BUG:while in reflexes mode, reflexes don't trigger movement like they should, 
	    	//and eyePos doesn't change like it should

	    	//use tiredness to decide if circle should stop moving regardless of pellet recognition

	    	if (res.drivesOutput!=null){
	    		if(res.drivesOutput[1]>=100){
	    			sleepMode=true;
	    		}
	    		if(res.drivesOutput[1]<=0){ //circle has gotten enough sleep. wake it back up.
	    			sleepMode=false;
	    		}
	    		if(res.drivesOutput[0]>=100){
	    			isRavenous=true;
	    		}
	    		if(res.drivesOutput[0]<=50){
	    			isRavenous=false;
	    		}
	    	}
	    	if(sleepMode){
	    		moveVel=0;
	    	}
	    	

	    	/*
			TODO:pass in a 20x20 grayscale bitmap as a 400 dim vector in addition to other data.
	    	*/
	    	//eyePos x memorizer index=4, eyePos y memorizer index=5
	    	//bug eyepos sticks
			function setEyePos(prevBrightness){
				if(res.memorizerOutput != null && !isRavenous){
					eyePos.x=res.memorizerOutput[4]/100*viewWidth;
					eyePos.y=res.memorizerOutput[5]/100*viewHeight;
				}
				else{
					if(prevBrightness > 10){
						//enter fixate mode: decrease random range of next eye pos by 50%
						eyePos.x=eyePos.x + (Math.random()*viewWidth)/32 - viewWidth/64;
						eyePos.y=eyePos.y + (Math.random()*viewHeight)/32 - viewHeight/64;			
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
				prevEyePos.x=eyePos.x;
				prevEyePos.y=eyePos.y;

				return eyePos;
			}
			eyePos = setEyePos(prevBrightness);	    	

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