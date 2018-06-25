const auth = require('./auth');

auth.check_captcha();

$('.login-btn').click(function () {
    var email = $('.email').val();
    var password = $('.password').val();
    var captcha_text = $('.captcha-text').val();

    auth.get_access_token(email, password, captcha_text);
});

