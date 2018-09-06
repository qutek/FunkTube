# FunkTube
This jQuery plugin provides responsive youtube embed with lazy loading iframe using video thumbnails as container background before iframe embeded, so it may be useful when displaying a lot of video on one page.

Check out the demo to view :
[http://demo.astahdziq.in/funktube/demo/lazyload.html](http://demo.astahdziq.in/funktube/demo/lazyload.html)
 
## How to use ##
Include funktube stylesheet :

    <link rel="stylesheet" href="path/to/jquery.funktube.css">

add html markup with attribute `data-id` to store youtube video id :

    <div class='testvideo' data-id="P8guDvMCS6c"></div>

Include jQuery, this jQuery plugin, and then initialize the element :

    <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js"></script>
    <script src="path/to/jquery.funktube.js"></script>
    <script>
	    $("#element").funktube();
    </script>

## Default Options ##

    <script>
	   $("#element").funktube({
    		initialVideo: 'P8guDvMCS6c', // possible to define video id from option
    		customControl: true,
    		useThumb: true,
    		lazyLoad: true,
    		dimmed: true,
    		allowFullScreen: true,
    		start: 0,
    		preferredQuality: 'auto',
    		showControls: false,
    		theme: 'dark', 
    		color: 'red', 
    		showRelated: false,
    		playsinline: false,
    		annotations: true,
    		autoPlay: true,
    		autoHide: true,
    		loop: 0,
    		showinfo: false,
    		modestbranding: false,
    		protocol: 'http',
    		enablejsapi: true,
    		origin: '',
    	});
    </script>

## Event ##

    <script>
       $("#element").funktube({
    		// functions called when events are triggered by using the funktube interface
    		onPlay: function() {}, // arg: id
    		onPause: function() {},
    		onStop: function() {},
    		onSeek: function() {}, // arg: time
    		onMute: function() {},
    		onUnMute: function() {},
    
    		// functions called when events are triggered from the youtube player itself
    		onPlayerUnstarted: function() {},
    		onPlayerEnded: function() {},
    		onPlayerPlaying: function() {},
    		onPlayerPaused: function() {},
    		onPlayerBuffering: function() {},
    		onPlayerCued: function() {},
    		onQualityChange: function() {},
    
    		// functions called when errors are thrown from the youtube player
    		onError: function() {},
    		onErrorNotFound: function() {},
    		onErrorNotEmbeddable: function() {},
    		onErrorInvalidParameter: function() {}
    	});
    </script>

## Methods ##

    jQuery("#element").funktube("cue", playerId);
        
    jQuery("#element").funktube("play");
    jQuery("#element").funktube("play", videoId);
    jQuery("#element").funktube("play", {id: videoId, time: 0});
    
    jQuery("#element").funktube("pause");
    
    jQuery("#element").funktube("stop");
    
    jQuery("#element").funktube("seek","0:32");
    jQuery("#element").funktube("seek",100); // or use seconds
    
    jQuery("#element").funktube("mute");
    jQuery("#element").funktube("unmute");
    jQuery("#element").funktube("isMuted");
    
    jQuery("#element").funktube("volume");
    jQuery("#element").funktube("volume",50);
    
    jQuery("#element").funktube("quality");
    jQuery("#element").funktube("quality", "hd720");
    
    jQuery("#element").funktube("playbackRate"); 
    jQuery("#element").funktube("playbackRate", 1.5); // video must support this
    
    jQuery("#element").funktube("data");
    jQuery("#element").funktube("opts");
    jQuery("#element").funktube("videoId");
    
    jQuery("#element").funktube("destroy");
    
    jQuery("#element").funktube("player");

## Install using Bower ##

    bower install funktube

