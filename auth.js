var request = require('request');
const settings = require('./settings');


exports.check_captcha = function() {
    var options = {
        method: 'GET',
        url: settings.CAPTCHA_URL,
        headers: { 'Authorization': 'oauth ' + settings.CLIENT_ID },
        jar: true // accept cookie
    };

    request(options, function(error, response, body) {
        if (JSON.parse(body)['show_captcha']) {
            get_captcha();
        }
    });
}

function get_captcha() {
    var options = {
        method: 'PUT',
        url: settings.CAPTCHA_URL,
        headers: { 'Authorization': 'oauth ' + settings.CLIENT_ID },
        jar: true
    };

    request(options, function(error, response, body) {
        var image = new Image();
        image.src = 'data:image/gif;base64,' + JSON.parse(body)['img_base64'];
        $('.captcha').prepend(image);
        $('.captcha').removeClass('hidden');
    });
}

