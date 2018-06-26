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


exports.get_access_token = function(email, password, captcha_text) {
    if (captcha_text) {
        var options = {
            method: 'POST',
            url: settings.CAPTCHA_URL,
            headers: settings.LOGIN_HEADER,
            jar: true,
            form: { input_text: captcha_text }
        };
        request(options, function(error, response, body) {
            authenticate(email, password);
        });
    }
    else {
        authenticate(email, password);
    }
}

function authenticate(email, password) {
    var auth_data = settings.AUTH_DATA;
    var time = Date.now();
    auth_data['timestamp'] = time;
    auth_data['signature'] = calculate_signature(auth_data);
    auth_data['username'] = email;
    auth_data['password'] = password;

    var options = {
        method: 'POST',
        url: settings.SIGN_IN_URL,
        form: auth_data,
        jar: true
    };
    request(options, function(error, response, body) {
        console.log(body);
        var body_dict = JSON.parse(body);
        var access_expire = time + body_dict['expires_in'];
        localStorage.setItem('access_token', body_dict['access_token']);
        localStorage.setItem('access_expire_time', access_expire.toString());
    });
}

function calculate_signature(auth_data) {
    const crypto = require('crypto');
    var hmac = crypto.createHmac('sha1', settings.APP_SECRET);

    var msg = auth_data['grant_type'] + auth_data['client_id'] + auth_data['source'] 
        + auth_data['timestamp'];
    hmac.update(msg);
    return hmac.digest('hex');
}

