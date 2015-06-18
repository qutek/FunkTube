# FunkTube
This jQuery plugin provides responsive youtube embed with lazy loading iframe using video thumbnails as container background before iframe embeded, so it may be useful when displaying a lot of video on one page.

Check out the demo to view :
[http://demo.astahdziq.in/funktube/example/sample.html](http://demo.astahdziq.in/funktube/example/sample.html)
 
## How to use ##
Include funktube stylesheet :

    <link rel="stylesheet" href="path/to/jquery.funktube.css">

add html markup with attribute `data-id` to store youtube video id :

    <div class='testvideo' data-id="cqNmVJk7Zyg"></div>

Include jQuery, this jQuery plugin, and then initialize the element :

    <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js"></script>
    <script src="path/to/jquery.funktube.js"></script>
    <script>
    jQuery(".testvideo").funktube();
    </script>
Please check out the simple example [here](https://github.com/qutek/FunkTube/blob/master/example/sample.html) 

## Install using Bower ##

    bower install funktube

## Credits ##
This plugin inspired from the jQuery-TubePlayer-Plugin by [tikku.com](http://tikku.com/)

## It’s Not Done, Yet ##