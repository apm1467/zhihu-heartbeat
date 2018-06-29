const feed = require('./feed');


// open links in external browser
const shell = require('electron').shell;
$(document).on('click', 'a[href^="http"]', function(event) {
    event.preventDefault();
    shell.openExternal(this.href);
});

// open feed images in new window
const {BrowserWindow} = require('electron').remote;
$(document).on('click', '.img', function(event) {
    var img_url;
    if ($(this).hasClass('single-img')) {
        img_url = $(this).attr('src');
    }
    else {
        img_url = $(this).css('background-image').slice(4, -1).replace(/"/g, "");
    }
    img_url = img_url.replace(/_[a-z]+/, "_qhd"); // get large image

    var img = new Image();
    img.src = img_url;
    img.onload = function(){
        var win = new BrowserWindow({
            titleBarStyle: 'hidden',
            show: false,
            height: this.height,
            width: this.width
        });
        // CSS "-webkit-app-region: drag;" is needed to make the image window draggable
        win.loadURL('data:text/html,' +
                    '<body style="-webkit-app-region: drag; margin: 0;">' +
                    '<img src="' + img_url + '" draggable="false"></body>');
        win.once('ready-to-show', function () {
            win.show();
        });
    };
});

// ------------------------------------------------------------

var time = Date.now();
var access_expire_time = localStorage.getItem('access_expire_time');

if (access_expire_time < time) {
    // access_token needs to be renewed first
    // feed.fetch_initial_feed() will be called automatically after authentication
    log_in();
}
else {
    // fetch feed directly using existing access_token
    feed.fetch_initial_feed();
}

function log_in() {
    const auth = require('./auth');
    auth.check_captcha();

    $('.login-btn').click(function () {
        var email = $('.email').val();
        var password = $('.password').val();
        var captcha_text = $('.captcha-text').val();
        auth.get_access_token(email, password, captcha_text);
    });

    $('.login-form').removeClass('hidden');
}

// ------------------------------------------------------------

enable_scroll_event();

exports.enable_scroll_event = enable_scroll_event;

function enable_scroll_event() {
    $(window).scroll(function () {
        var page_length = $(document).height();
        var scroll_position = $(window).scrollTop();

        // enable infinite scroll (scroll down to request older feed)
        if (page_length - scroll_position < 3000) {
            feed.fetch_older_feed();

            // unbind scroll event so only one fetch request is sent
            // the scroll event will be binded again after fetch in feed.fetch_older_feed()
            $(window).off('scroll');
        }

        // scroll to top to remove feed update notification
        if (scroll_position == 0) {
            $('#update-notification').removeClass('notification-show');
        }
    });
}

// ------------------------------------------------------------

// check feed update every 10 seconds
setInterval(function() {
    feed.check_update();
}, 10000);


// ------------------------------------------------------------

// update pin time every second
setInterval(function() {
    $('.time').each(function () {
        var seconds = parseInt($(this).attr('data-time'));
        seconds += 1;
        $(this).text(get_relative_time_str(seconds));
    });
}, 1000);

// seconds: int
function get_relative_time_str(seconds) {
    const sec_per_min = 60;
    const sec_per_hour = sec_per_min * 60;
    const sec_per_day = sec_per_hour * 24;
    const sec_per_week = sec_per_day * 7;

    var now = Math.round(Date.now() / 1000);
    var diff = now - seconds;

    if (diff < sec_per_min) {
         return diff + ' 秒前';   
    }
    else if (diff < sec_per_hour) {
         return Math.round(diff / sec_per_min) + ' 分前';   
    }
    else if (diff < sec_per_day ) {
         return Math.round(diff / sec_per_hour) + ' 时前';   
    }
    else if (diff < sec_per_week) {
        return Math.round(diff / sec_per_day) + ' 日前';   
    }
    else {
        date = new Date(seconds * 1000);
        return date.getMonth() + ' 月 ' + date.getDate() + ' 日';
    }
}
