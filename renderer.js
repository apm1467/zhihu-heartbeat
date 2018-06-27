// open links in external browser
const shell = require('electron').shell;
$(document).on('click', 'a[href^="http"]', function(event) {
    event.preventDefault();
    shell.openExternal(this.href);
});


var time = Date.now();
var access_expire_time = localStorage.getItem('access_expire_time');

if (access_expire_time < time) {
    // access_token needs to be renewed first
    // feed.fetch_feed() will be called automatically after authentication
    log_in();
}
else {
    // fetch feed directly using existing access_token
    const feed = require('./feed');
    feed.fetch_feed();
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