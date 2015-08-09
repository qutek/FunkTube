/**
 * jQuery FunkTube (Youtube Custom Player) - v1.0
 * Youtube embed with lazy load iframe and custom player style
 * based on https://github.com/nirvanatikku/jQuery-TubePlayer-Plugin
 * Copyright (c) 2015 lafif Astahdziq
 */
;(function($) {

	'use strict';

	//
	//  namespace
	//
	var FUNKTUBE = ".funktube",

		FUNKTUBE_CLASS = "funk-tube",

		OPTS = "opts" + FUNKTUBE;

	//	
	//
	// FunkTube package 
	//
	//
	var FT = {

		inited: false,				// funktube inited flag - for destroy/re-init
		
		ytplayers: {},				// all the instances that exist

		playThumbnail: [],			// thumbnail

		control: [],				// control

		playerData: {
			duration: 0,
			currentTime:0,
			videoLoadedFraction:0,
			quality: 'auto',
			availableQualityLevels: ['auto']
		},

		fullScreenApi: {
            supportsFullScreen: false,
            fullScreenEventName: '',
            prefix: ''
        },

        browserPrefixes: 'webkit moz o ms khtml'.split(' '),
		
		inits: [],					// local init functions for multiple iframe players
		
		iframeScriptInited: false,	// no need to import the iframe script multiple times
		
		State: { 
			'UNSTARTED': -1,
			'ENDED': 0,
			'PLAYING': 1,
			'PAUSED': 2,
			'BUFFERING': 3,
			'CUED': 5
		},
		
		Error: {
			'BAD_INIT': 0,
			'INVALID_PARAM': 2,
			'NOT_FOUND': 100,
			'NOT_EMBEDDABLE': 101,
			'CANT_PLAY': 150
		}
		
	};

	//
	//
	// public facing defaults
	//
	//
	$.funktube = {
		
		events: {},				// events cache -- used by flashplayer version of video player
		
		FunkTube: FT			// reference to the internal FunkTube object. primarily exposed for testing.
		
	};

	/**
	 * These are all the events that are bound to the YouTube Player
	 * the events can be overridden as they are public.
	 *
	 * There are several functions that serve as wrappers to be utilized
	 * internally - stateChange, onError, qualityChange. Change them at your
	 * own risk.
	 */
	$.funktube.defaults = {

		afterReady: function(player) {
			// this.syncUI(player);
		}, // args: $player

		stateChange: function(player) {

			var _ret = this.onPlayer;

			return function(state) {

				var _player = $('#'+player).parent();
			
				if (typeof(state) === "object") {
					state = state.data;
				}

				switch (state) {

				case FT.State.UNSTARTED:
					return _ret.unstarted[player].call(_player);

				case FT.State.ENDED:
					return _ret.ended[player].call(_player);

				case FT.State.PLAYING:
					return _ret.playing[player].call(_player);

				case FT.State.PAUSED:
					return _ret.paused[player].call(_player);

				case FT.State.BUFFERING:
					return _ret.buffering[player].call(_player);

				case FT.State.CUED:
					return _ret.cued[player].call(_player);

				default:
					return null;

				}
			};

		},

		onError: function(player) {

			var _ret = this.onErr;

			return function(errorCode) {
				
				var _player = $('#'+player).parent();

				if (typeof(errorCode) === "object") {
					errorCode = errorCode.data;
				}

				switch (errorCode) {

				case FT.Error.BAD_INIT:
				case FT.Error.INVALID_PARAM:
					return _ret.invalidParameter[player].call(_player);

				case FT.Error.NOT_FOUND:
					return _ret.notFound[player].call(_player);

				case FT.Error.NOT_EMBEDDABLE:
				case FT.Error.CANT_PLAY:
					return _ret.notEmbeddable[player].call(_player);

				default:
					return _ret.defaultError[player].call(_player);

				}

			};

		},

		qualityChange: function(player) {

			var _this = this;

			return function(suggested) {
				
				var _player = $('#'+player).parent();

				if (typeof(suggested) === "object") {
					suggested = suggested.data;
				}

				return _this.onQualityChange[player].call(_player, suggested);

			};

		},

		onQualityChange: {},

		onPlayer: {
			unstarted: {},
			ended: {},
			playing: {},
			paused: {},
			buffering: {},
			cued: {}
		},

		onErr: {
			defaultError: {},
			notFound: {},
			notEmbeddable: {},
			invalidParameter: {}
		},

	};

	/**
	 * These are the internal defaults for the FunkTube
	 * plugin to work without providing any parameters. They
	 * are merged with the users options.
	 */
	var defaults = {

		// public facing
		width: '',
		height: '',
		ratio: '16:9',
		useThumb: true,
		allowFullScreen: "true",
		initialVideo: undefined,
		start: 0,
		preferredQuality: "auto",
		showControls: false,
		showRelated: false,
		playsinline: false,
		annotations: true,
		autoPlay: true,
		autoHide: true,
		loop: 0,
		theme: 'dark',
		// 'dark' or 'light'
		color: 'red',
		// 'red' or 'white'
		showinfo: false,
		modestbranding: false,
		protocol: 'http',
		// set to 'https' for compatibility on SSL-enabled pages
		// with respect to [wmode] - 'transparent' maintains z-index, but disables GPU acceleration
		wmode: 'transparent',
		// you probably want to use 'window' when optimizing for mobile devices
		
		allowScriptAccess: "always",
		playerID: "funktube-container",

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

	};

	/**
	 * The FunkTube plugin bound to the jQuery object's prototype.
	 * This method acts as an interface to instantiate a FunkTube,
	 * as well as invoke events that are attached - typically getters/setters
	 */
	$.fn.funktube = function(input, xtra) {

		var $this = $(this);

		var type = typeof input;

		if (arguments.length === 0 || type === "object") {

			return $this.each(function() {

				FT.init($(this), input);

			});

		} else if (type === "string") {

			return $this.triggerHandler(input + FUNKTUBE, (typeof xtra !== 'undefined' ? xtra : null));
		
		}

	};


	/**
	 * This method is the base method for all the events
	 * that are bound to the FunkTube.
	 */
	var wrap_fn = function(fn) {

		return function(evt, param) {

			var p = FT.getPkg(evt);

			if (p.ytplayer) {

				var ret = fn(evt, param, p);

				if (typeof(ret) === "undefined") {
					ret = p.$player;
				}

				return ret;

			}

			return p.$player;

		};

	};

	/**
	 * Convert integer time to time format
	 * @param  {[type]} secs [description]
	 * @return {[type]}      [description]
	 */
	var convertTime = function(secs) {

		var hr = Math.floor(secs / 3600),
        	min = Math.floor((secs - (hr * 3600)) / 60),
        	sec = Math.floor(secs - (hr * 3600) - (min * 60)),
        	time = '00:00:00';

        if (hr < 10) {
            hr = "0" + hr;
        }
        if (min < 10) {
            min = "0" + min;
        }
        if (sec < 10) {
            sec = "0" + sec;
        }
        if (hr) {
            hr = "00";
        }
        
        if(typeof(secs) == 'number'){
            time = hr + ':' + min + ':' + sec;
        }

        return time;
	};

	/**
	 * get percentage based time and total time
	 * @param  {[type]} cur [description]
	 * @param  {[type]} tot [description]
	 * @return {[type]}     [description]
	 */
	var getPercent = function(cur, tot) {
		return (cur / tot * 100).toFixed(2);
	};

	var setFill = function(event, slideEl) {
          
        var controlData = {
            cFill: slideEl.find('.slide-control'),
            cWidth: slideEl.width(),
            cOffset: slideEl.offset()
        };

      var percent = (event.clientX - controlData.cOffset.left) * (100/controlData.cWidth);
      return percent;
    };

	var updateOption = function(dataOpt){
		var optionsarray = dataOpt,
			seloption = '';

		$.each(optionsarray,function(i){
		    seloption += '<option value="'+optionsarray[i]+'">'+optionsarray[i]+'</option>'; 
		});

		return seloption;
	};

	// var launchIntoFullscreen = function(element) {
	//   	if(element.requestFullscreen) {
	//     	element.requestFullscreen();
	//   	} else if(element.mozRequestFullScreen) {
	//     	element.mozRequestFullScreen();
	//   	} else if(element.webkitRequestFullscreen) {
	//     	element.webkitRequestFullscreen();
	//   	} else if(element.msRequestFullscreen) {
	//     	element.msRequestFullscreen();
	//   	}

	// 	$(element).addClass('fullscreen');
	// };

	// var exitFullscreen = function(element) {
	//   	if(document.exitFullscreen) {
	//     	document.exitFullscreen();
	//   	} else if(document.mozCancelFullScreen) {
	//     	document.mozCancelFullScreen();
	//   	} else if(document.webkitExitFullscreen) {
	//     	document.webkitExitFullscreen();
	//   	}

	//   	$(element).removeClass('fullscreen');
	// }

	/**
	 * Public method to get all the player instances
	 */
	$.funktube.getPlayers = function() {

		return FT.ytplayers;

	};


	/**
	 * Initialize a YouTube player;
	 *
	 *	First check to see if FunkTube has been init'd
	 *	if it has then return, otherwise:
	 *		> add the funktube class (used to denote a player)
	 *		> provide local data access to the options and store it
	 *		> initialize the default events on the jQuery instance
	 *		> create the container for the player
	 *		> initialize the player (iframe/HTML5 vs flash based)
	 *
	 *	@param $player - the instance being created on
	 *	@param opts - the user's options
	 */
	FT.init = function($player, opts) {

		if ($player.hasClass(FUNKTUBE_CLASS)) return $player;

		// check fullscreen for native support
	    if (typeof document.cancelFullScreen != 'undefined') {
	        FT.fullScreenApi.supportsFullScreen = true;
	    } else {
	        // check for fullscreen support by vendor prefix
	        for (var i = 0, il = FT.browserPrefixes.length; i < il; i++ ) {
	            FT.fullScreenApi.prefix = FT.browserPrefixes[i];
	 
	            if (typeof document[FT.fullScreenApi.prefix + 'CancelFullScreen' ] != 'undefined' ) {
	                FT.fullScreenApi.supportsFullScreen = true;
	 
	                break;
	            }
	        }
	    }

	    // update eventname for fullscreen
	    if (FT.fullScreenApi.supportsFullScreen) {
	        FT.fullScreenApi.fullScreenEventName = FT.fullScreenApi.prefix + 'fullscreenchange';

	        document.addEventListener(FT.fullScreenApi.fullScreenEventName, FT.fullScreenChange );
	    }

		var o = $.extend({}, defaults, opts);

		o.playerID += "-" + guid();
		
		// another way to get video id with data-id
		if(typeof o.initialVideo === 'undefined'){
			o.initialVideo = $player.attr('data-id');
		}

		$player.addClass(FUNKTUBE_CLASS).data(OPTS, o);

		for (var event in PLAYER)
			$player.bind(event + FUNKTUBE, $player, PLAYER[event]);

		// initialize the default event methods
		FT.initDefaults($.funktube.defaults, o);

		$(FT.getControl($player, o)).appendTo($player);

		// if use thumbnails
		if(o.useThumb){
			FT.getThumb($player,o);
		} else {

			$("<div></div>").attr("id", o.playerID).appendTo($player);
			// init
			FT.initPlayer($player, o);
			// sync ui
			FT.syncUI($player, o);
		}

		return $player;

	};

	FT.getThumb = function($player, o) {

		// append thumbnail
		var ratio = o.ratio.split(":"),
			playerWidth = $player.width(),
			thumb_img = '';

		// get best matched image size to faster
		if (playerWidth > 640) {
          thumb_img = 'maxresdefault.jpg';
        } else if (playerWidth > 480) {
          thumb_img = 'sddefault.jpg';
        } else if (playerWidth > 320) {
          thumb_img = 'hqdefault.jpg';
        } else if (playerWidth > 120) {
          thumb_img = 'mqdefault.jpg';
        } else {
          thumb_img = 'default.jpg';
        }

        FT.playThumbnail.push('<div class="thumb-play-button"');
      	if (playerWidth <= 640) FT.playThumbnail.push(' style="transform: scale(0.563888888888889);"');
      	FT.playThumbnail.push('>');
      	FT.playThumbnail.push('<svg>');
        	FT.playThumbnail.push('<path fill-rule="evenodd" clip-rule="evenodd" fill="#1F1F1F" class="thumb-play-button-svg" d="M84.15,26.4v6.35c0,2.833-0.15,5.967-0.45,9.4c-0.133,1.7-0.267,3.117-0.4,4.25l-0.15,0.95c-0.167,0.767-0.367,1.517-0.6,2.25c-0.667,2.367-1.533,4.083-2.6,5.15c-1.367,1.4-2.967,2.383-4.8,2.95c-0.633,0.2-1.316,0.333-2.05,0.4c-0.767,0.1-1.3,0.167-1.6,0.2c-4.9,0.367-11.283,0.617-19.15,0.75c-2.434,0.034-4.883,0.067-7.35,0.1h-2.95C38.417,59.117,34.5,59.067,30.3,59c-8.433-0.167-14.05-0.383-16.85-0.65c-0.067-0.033-0.667-0.117-1.8-0.25c-0.9-0.133-1.683-0.283-2.35-0.45c-2.066-0.533-3.783-1.5-5.15-2.9c-1.033-1.067-1.9-2.783-2.6-5.15C1.317,48.867,1.133,48.117,1,47.35L0.8,46.4c-0.133-1.133-0.267-2.55-0.4-4.25C0.133,38.717,0,35.583,0,32.75V26.4c0-2.833,0.133-5.95,0.4-9.35l0.4-4.25c0.167-0.966,0.417-2.05,0.75-3.25c0.7-2.333,1.567-4.033,2.6-5.1c1.367-1.434,2.967-2.434,4.8-3c0.633-0.167,1.333-0.3,2.1-0.4c0.4-0.066,0.917-0.133,1.55-0.2c4.9-0.333,11.283-0.567,19.15-0.7C35.65,0.05,39.083,0,42.05,0L45,0.05c2.467,0,4.933,0.034,7.4,0.1c7.833,0.133,14.2,0.367,19.1,0.7c0.3,0.033,0.833,0.1,1.6,0.2c0.733,0.1,1.417,0.233,2.05,0.4c1.833,0.566,3.434,1.566,4.8,3c1.066,1.066,1.933,2.767,2.6,5.1c0.367,1.2,0.617,2.284,0.75,3.25l0.4,4.25C84,20.45,84.15,23.567,84.15,26.4z M33.3,41.4L56,29.6L33.3,17.75V41.4z"></path>');
	        FT.playThumbnail.push('<polygon fill-rule="evenodd" clip-rule="evenodd" fill="#FFFFFF" points="33.3,41.4 33.3,17.75 56,29.6"></polygon>');
      	FT.playThumbnail.push('</svg>');
  		FT.playThumbnail.push('</div>'); // end of .thumb-play-button

		$('<div class="funk-frame"></div>').attr('id', o.playerID).css({
            'background-image': ['url(//img.youtube.com/vi/', o.initialVideo, '/', thumb_img, ')'].join('')
        }).addClass('image-loaded')
        .on('click', function(){
			//append the player into the container on click
			FT.initPlayer($player, o);
		})
		.html(FT.playThumbnail.join(''))
		.appendTo($player);
		
		// sync ui
		FT.syncUI($player, o);

	};

	FT.getControl = function($player, o){
		// create controll
		FT.control.push('<div class="preloader-container"><div class="loader"></div></div>');
		FT.control.push('<div class="funk-yt-controls">');
        FT.control.push('<div class="funk-yt-time-rail">');
      	FT.control.push('<span class="funk-yt-time-total funk-yt-slide" data-control="seek">');
        FT.control.push('<span class="funk-yt-time-loaded"></span>');
		FT.control.push('<span class="funk-yt-time-current slide-control"></span>');
		FT.control.push('<span class="funk-yt-time-float slide-info">'); // tooltip time
		FT.control.push('<span class="funk-yt-time-float-current"></span>');
		FT.control.push('</span>');
		FT.control.push('</span>');
		FT.control.push('</div>');

		FT.control.push('<div class="funk-yt-button btn-play icon-play" data-control="play"></div>');
		FT.control.push('<div class="funk-yt-button btn-pause icon-pause" data-control="pause" style="display:none;"></div>');
		FT.control.push('<div class="funk-yt-button btn-mute icon-unmute" data-control="mute"></div>');
		FT.control.push('<div class="funk-yt-button btn-unmute icon-mute" data-control="unmute"></div>');
		FT.control.push('<div class="funk-yt-slide volume" data-control="volume"><div class="slide-control"></div></div>');
		FT.control.push('<div class="funk-yt-info current-time">00:00:00</div>');
		FT.control.push('<div class="funk-yt-info total-time">| 00:00:00</div>');
		FT.control.push('<div class="funk-yt-button btn-right icon-fullscreen fullscreen"></div>');
		// FT.control.push('<div class="btn-right quality">');
		// FT.control.push('<div class="quality-status"></div>');
		// FT.control.push('<div class="av-quality"></div>'); // container available quality
		// FT.control.push('</div>');
		FT.control.push('</div>');

		// insert the player container
		return FT.control.join('');
	};

	/**
	 * Every method needs these items
	 */
	FT.getPkg = function(evt) {

		var $player = evt.data;

		var opts = $player.data(OPTS);

		var ytplayer = FT.ytplayers[opts.playerID];

		return {

			$player: $player,

			opts: opts,

			ytplayer: ytplayer

		};

	};

	/**
	 * This method handles the player init. Since
	 * onYouFunkTubeReady is called when the script
	 * has been evaluated, we want all the instances
	 * to get init'd. For this we have a init queue.
	 * If the script has been init'd, we automatically
	 * pop the method off the queue and init the player.
	 */
	FT.iframeReady = function(o) {

		FT.inits.push(function() {

			new YT.Player(o.playerID, {

				videoId: o.initialVideo,

				width: o.width,

				height: o.height,

				playerVars: {

					'autoplay': (o.autoPlay ? 1 : 0),

					'autohide': (o.autoHide ? 1 : 0),

					'controls': (o.showControls ? 1 : 0),

					'loop': (o.loop ? 1 : 0),

					'playlist': (o.loop ? o.initialVideo : ""),

					'rel': (o.showRelated ? 1 : 0),

					'fs': (o.allowFullScreen ? 1 : 0),

					'wmode': o.wmode,

					'showinfo': (o.showinfo ? 1 : 0),

					'modestbranding': (o.modestbranding ? 1 : 0),

					'iv_load_policy': (o.annotations ? 1 : 3),

					'start': o.start,

					'theme': o.theme,

					'color': o.color,

					'playsinline': o.playsinline

				},

				events: {

					'onReady': function(evt) {

						FT.ytplayers[o.playerID] = evt.target;

						var $player = $(evt.target.getIframe()).parents("." + FUNKTUBE_CLASS);

						$.funktube.defaults.afterReady($player);

					},

					'onPlaybackQualityChange': $.funktube.defaults.qualityChange(o.playerID),

					'onStateChange': $.funktube.defaults.stateChange(o.playerID),

					'onError': $.funktube.defaults.onError(o.playerID)

				}

			});

		});

		// stacked init method
		if (FT.inits.length >= 1 && !FT.inited) {

			return function() {

				for (var i = 0; i < FT.inits.length; i++) {

					FT.inits[i]();

				}

				FT.inited = true;

			};

		}

		// if we've inited already, just call the init fn
		if (FT.inited) {

			(FT.inits.pop())();

		}

		return window.onYouTubePlayerAPIReady;

	};

	/**
	 * @param d - the defaults
	 * @param o - the options w/ methods to attach
	 */
	FT.initDefaults = function(d, o) {

		var ID = o.playerID;

		// default onPlayer events
		var dp = d.onPlayer;
		dp.unstarted[ID] = o.onPlayerUnstarted;
		dp.ended[ID] = o.onPlayerEnded;
		dp.playing[ID] = o.onPlayerPlaying;
		dp.paused[ID] = o.onPlayerPaused;
		dp.buffering[ID] = o.onPlayerBuffering;
		dp.cued[ID] = o.onPlayerCued;

		// default onQualityChange
		d.onQualityChange[ID] = o.onQualityChange;

		// default onError events
		var de = d.onErr;
		de.defaultError[ID] = o.onError;
		de.notFound[ID] = o.onErrorNotFound;
		de.notEmbeddable[ID] = o.onErrorNotEmbeddable;
		de.invalidParameter[ID] = o.onErrorInvalidParameter;

	};

	/**
	 * init the iframed option if its requested 
	 * @param $player - the player that the funktube binds to
	 * @param o - the init options
	 */
	FT.initPlayer = function($player, o) {

		FT.initIframePlayer($player, o);

		$($player).find('.funk-frame').removeClass('image-loaded').addClass('video-loaded')
		.css('background-image','');

	};

    FT.requestFullScreen = function(el) {
    	var _this = FT.fullScreenApi;
        return (_this.prefix === '') ? el.requestFullScreen() : el[_this.prefix + 'RequestFullScreen']();
    };

    FT.cancelFullScreen = function(el) {
    	var _this = FT.fullScreenApi;
        return (_this.prefix === '') ? document.cancelFullScreen() : document[_this.prefix + 'CancelFullScreen']();
    };

    FT.fullScreenChange = function(ev) {
    	var target = $( ev.target );
    	target.toggleClass('fullscreen');
    };

	FT.syncUI = function($player, o) {

       	$player.find('.funk-yt-button').on('click', function(){
       		alert(FT.inited);
       		var bind = $(this).attr('data-control'),
				param = $(this).attr('data-param');

			if(typeof(bind) == 'string'){
				$player.funktube(bind, param);
			}
       	});

       	// alert(curQuality);
		setInterval(function(){
		   	FT.playerData = $player.funktube('data');
		   	// console.log(FT.playerData.currentTime);
		   	$player.find('.current-time').text(convertTime(FT.playerData.currentTime));
		   	$player.find('.total-time').text('| '+ convertTime(FT.playerData.duration));
			$player.find('.funk-yt-time-current').css('width', getPercent(FT.playerData.currentTime, FT.playerData.duration)+'%'); // set progressbar percentage
			$player.find('.funk-yt-time-float').css('left', getPercent(FT.playerData.currentTime, FT.playerData.duration)+'%'); // set position of tooltip
			$player.find('.funk-yt-time-loaded').css('width', FT.playerData.videoLoadedFraction*FT.playerData.duration);
		   	$player.find('.funk-yt-time-float-current').text(convertTime(FT.playerData.currentTime));
		},100); //polling frequency in miliseconds

		// progress bar and volume
		$('.funk-yt-slide').each(function(){

	      var $control = $(this),
	      	  $bind = $control.attr('data-control'),
	          $window = $(window);

	      $control.on('mousedown', function() {
	        $control.on('mousemove', function(){

		        $control.find('.slide-control').css('width', setFill(event, $control) + '%');
		        $control.find('.slide-info').css('left', setFill(event, $control) + '%');
		        // update
	          	if($bind == 'seek'){
		        	$player.funktube($bind, ( setFill(event, $control) / 100) * FT.playerData.duration );
		        } else {
		        	$player.funktube($bind, setFill(event, $control).toFixed());
		        }
	        });
	      });

	      $control.on('click', function(event) {

	        $control.find('.slide-control').css('width', setFill(event, $control) + '%');
	        $control.find('.slide-info').css('left', setFill(event, $control) + '%');
	        // update
	        if($bind == 'seek'){
	        	$player.funktube($bind, ( setFill(event, $control) / 100) * FT.playerData.duration );
	        } else {
	        	$player.funktube($bind, setFill(event, $control).toFixed());
	        }
	      });

	      $window.on('mouseup', function(event) {
	        $control.off('mousemove');
	      });
	    });

		// fullscreen
		$player.find('.fullscreen').on('click', function(){

			var elem = $player.get(0);

			if($player.hasClass('fullscreen')){
				FT.cancelFullScreen(elem);
			} else {
				FT.requestFullScreen(elem);
			}

		});
	

		/**
		 * Todo add quality change button
		 */

   	};

	/**
	 * Initialize an iframe player
	 */
	FT.initIframePlayer = function($player, o) {

		if (!FT.iframeScriptInited) {

			// write the api script tag
			var tag = document.createElement('script');

			tag.src = o.protocol + "://www.youtube.com/iframe_api";

			var firstScriptTag = document.getElementsByTagName('script')[0];

			firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

			FT.iframeScriptInited = true;

		}

		// init the iframe player
		window.onYouTubePlayerAPIReady = FT.iframeReady(o);

	};

	// fmt: youtube.com/watch?x=[anything]&v=[desired-token]&
	FT.getVideoIDFromURL = function(sURL) {

		sURL = sURL || ""; // make sure it's a string; sometimes the YT player API returns undefined, and then indexOf() below will fail
		var qryParamsStart = sURL.indexOf("?");

		var qryParams = sURL.substring(qryParamsStart, sURL.length);

		var videoStart = qryParams.indexOf("v=");
		if (videoStart > -1) {
			var videoEnd = qryParams.indexOf("&", videoStart);
			if (videoEnd === -1) {
				videoEnd = qryParams.length;
			}
			return qryParams.substring(videoStart + "v=".length, videoEnd);
		}

		return "";

	};

	/**
	 * All the events that are bound to a FunkTube instance
	 */
	var PLAYER = {
		
		opts: wrap_fn(function(evt,param,p){
			
			return p.opts;
			
		}),

		cue: wrap_fn(function(evt, param, p) {

			p.ytplayer.cueVideoById(param, 0, p.opts.preferredQuality);

		}),

		play: wrap_fn(function(evt, param, p) {

			if (typeof(param) === 'object') p.ytplayer.loadVideoById({videoId: param.id, startSeconds: param.time, suggestedQuality: p.opts.preferredQuality });

			else if (typeof param !== 'undefined') p.ytplayer.loadVideoById({videoId: param, startSeconds: 0, suggestedQuality: p.opts.preferredQuality });

			else p.ytplayer.playVideo();

			p.opts.onPlay(param);

		}),

		pause: wrap_fn(function(evt, param, p) {

			p.ytplayer.pauseVideo();

			p.opts.onPause(p);

		}),

		stop: wrap_fn(function(evt, param, p) {

			p.ytplayer.stopVideo();

			p.opts.onStop(p);

		}),

		seek: wrap_fn(function(evt, param, p) {

			if (/:/.test(param)) {
				var parts = param.split(":").reverse();
				param = 0;
				for (var i = 0; i < parts.length; i++) {
					param += Math.pow(60, i) * (parts[i] | 0);
				}
			}

			p.ytplayer.seekTo(param, true);

			p.opts.onSeek(param);

		}),

		mute: wrap_fn(function(evt, param, p) {

			p.$player.attr("data-prev-mute-volume", p.ytplayer.getVolume());

			p.ytplayer.mute();

			p.opts.onMute(p);

		}),

		unmute: wrap_fn(function(evt, param, p) {

			p.ytplayer.unMute();

			p.ytplayer.setVolume((p.$player.attr("data-prev-mute-volume") || 50));

			p.opts.onUnMute();

		}),

		isMuted: wrap_fn(function(evt, param, p) {

			return p.ytplayer.isMuted();

		}),

		volume: wrap_fn(function(evt, param, p) {

			if (typeof param !== 'undefined') {

				p.ytplayer.setVolume(param);

				p.$player.attr("data-prev-mute-volume", p.ytplayer.getVolume());

			} else {

				return p.ytplayer.getVolume() || 0; // 0 because iframe's currently in labs
				
			}

		}),

		quality: wrap_fn(function(evt, param, p) {

			if (typeof param !== 'undefined') p.ytplayer.setPlaybackQuality(param);

			else return p.ytplayer.getPlaybackQuality();

		}),
		
		playbackRate: wrap_fn(function(evt, param, p){
			
			if(typeof param !== "undefined") p.ytplayer.setPlaybackRate(param);
		
			else return p.ytplayer.getPlaybackRate();
			
		}),

		data: wrap_fn(function(evt, param, p) {

			var ret = {};

			var P = p.ytplayer;

			ret.videoLoadedFraction = P.getVideoLoadedFraction();

			ret.bytesLoaded = P.getVideoBytesLoaded(); // deprecated

			ret.bytesTotal = P.getVideoBytesTotal(); // deprecated

			ret.startBytes = P.getVideoStartBytes(); // deprecated

			ret.state = P.getPlayerState();

			ret.currentTime = P.getCurrentTime();

			ret.duration = P.getDuration();

			ret.videoURL = P.getVideoUrl();

			ret.videoEmbedCode = P.getVideoEmbedCode();

			ret.videoID = FT.getVideoIDFromURL(ret.videoURL);

			ret.availableQualityLevels = P.getAvailableQualityLevels();
			
			ret.availablePlaybackRates = P.getAvailablePlaybackRates();

			return ret;

		}),

		videoId: wrap_fn(function(evt, param, p) {

			return FT.getVideoIDFromURL(p.ytplayer.getVideoUrl());

		}),

		size: wrap_fn(function(evt, param, p) {

			if (typeof param !== 'undefined' && param.width && param.height) {

				p.ytplayer.setSize(param.width, param.height);

				$(p.ytplayer).css(param);

			}

		}),

		destroy: wrap_fn(function(evt, param, p) {
			
			p.$player.removeClass(FUNKTUBE_CLASS).data(OPTS, null).unbind(FUNKTUBE).html("");

			delete FT.ytplayers[p.opts.playerID];

			// cleanup callback handler references..
			var d = $.funktube.defaults;

			var events = ['unstarted', 'ended', 'playing', 'paused', 'buffering', 'cued'];

			$.each(events, function(i, event) {
				delete d.onPlayer[event][p.opts.playerID];
			});

			events = ['defaultError', 'notFound', 'notEmbeddable', 'invalidParameter'];
			$.each(events, function(i, event) {
				delete d.onErr[event][p.opts.playerID];
			});

			delete d.onQualityChange[p.opts.playerID];

			delete $.funktube.events[p.opts.playerID]; // flash callback ref's
			if ('destroy' in p.ytplayer) {
				p.ytplayer.destroy();
			}

			$(p.ytplayer).remove();

			return null;

		}),

		player: wrap_fn(function(evt, param, p) {

			return p.ytplayer;

		})

	};

	// used in case of multiple players
	function guid() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		});
	}

})(jQuery);