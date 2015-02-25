if(typeof IhtaiUtils == "undefined")
	var IhtaiUtils={};

IhtaiUtils.Vision = (function(bundle){
	var eyePos={x:0, y:0}, prevEyePos={x:0, y:0};
	var diffBitmap, colorBitmap, visionTree;
	var diffAvg, colorAvg;
	var focusWidth, focusHeight, fovWidth, fovHeight;

	function init(){
		focusWidth=bundle.focusWidth;
		focusHeight=bundle.focusHeight;
		fovWidth=bundle.fovWidth;
		fovHeight=bundle.fovHeight;
		fovHalfWidth=Math.floor(fovWidth/2);
		fovHalfHeight=Math.floor(fovHeight/2);

		//TODO:init vision kdtree
	}
	init();

	function setEyePos(avgColorBrightness, avgEdgeBrightness){

		if((avgColorBrightness+avgEdgeBrightness)/2 > 100){
			//enter fixate mode: decrease random range of next eye pos by 50%
			eyePos.x=eyePos.x + (Math.random()*fovWidth)/2 - fovHalfWidth/2;
			eyePos.y=eyePos.y + (Math.random()*fovHeight)/2 - fovHalfHeight/2;			
		}
		else{
			eyePos.x=eyePos.x + Math.random()*fovWidth - fovHalfWidth;
			eyePos.y=eyePos.y + Math.random()*fovHeight - fovHalfHeight;
		}

		//constrain within bitmap
		if(eyePos.x < 0)
			eyePos.x=0;
		if(eyePos.x + focusWidth > fovWidth)
			eyePos.x = fovWidth - focusWidth;

		if(eyePos.y < 0)
			eyePos.y=0;
		if(eyePos.y + focusHeight > fovHeight)
			eyePos.y = fovHeight - focusHeight;		

		prevEyePos.x=eyePos.x;
		prevEyePos.y=eyePost.y;
	}

	function getEdgeBitmap(bitmap){
		var edgeBitmap;
		//todo:apply edge filter
		return edgeBitmap;
	}

	function getAvgBrightness(bitmap){
		var brightness;
		//todo:sum all pixels for brightness value, divide by total number of pixels

		return brightness;
	}


	function cycle(){

		/*TODO:
		-using eyePos, get fovWidth*fovHeight bitmap chunk
		-process original chunk with edge detector. save copy
		-process original chunk with blur filter. save copy (maybe not necessary)
		-pass in edge bitmap, blur bitmap to their own kdtrees. pass in the id from edge bitmap, blur bitmap,
		and the eye position coordinates to the joint vision kd tree. return id of joint vision tree cluster
		selected, or possibly eyepos separate from the others
		*/
		var origBitmap;
		var edgeBitmap=getEdgeBitmap(origBitmap);
		//todo:get average color brightness value from origBitmap and edgeBitmap.
		//pass these into setEyePos()
		var avgColorBrightness= getAvgBrightness(origBitmap);
		var avgEdgeBrightness = getAvgBrightness(edgeBitmap);

		setEyePos(avgColorBrightness, avgEdgeBrightness);
		/*
		@returns : an vector of vision and eye position values

		*/
	}

	return {
		cycle:cycle,
		getEdgeBitmap:getEdgeBitmap,
		getAvgBrightness:getAvgBrightness
	}
});