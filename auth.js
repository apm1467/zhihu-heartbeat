var request = require('request');
const constants = require('./constants');


exports.check_captcha = check_captcha;
function check_captcha() {
    var options = {
        method: 'GET',
        url: constants.CAPTCHA_URL,
        headers: constants.CAPTCHA_REQUEST_HEADER,
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
        url: constants.CAPTCHA_URL,
        headers: constants.LOGIN_REQUEST_HEADER,
        jar: true
    };
    request(options, function(error, response, body) {
        console.log(response);
        if ('error' in JSON.parse(body)) {
            check_captcha();
            return;
        }

        var image = new Image();
        image.src = 'data:image/gif;base64,' + JSON.parse(body)['img_base64'];
        $('.captcha').prepend(image);
        $('.captcha').removeClass('hidden');
    });
}


exports.get_access_token = function(email, password, captcha_text) {
    if (captcha_text) {
        // submit captcha text before authentication
        var options = {
            method: 'POST',
            url: constants.CAPTCHA_URL,
            headers: constants.LOGIN_REQUEST_HEADER,
            jar: true,
            form: { input_text: captcha_text }
        };
        request(options, function(error, response, body) {
            var body_dict = JSON.parse(body);
            if (body_dict['error']) {
                reload_login_page(body_dict['error']['message']);
                return;
            }

            authenticate(email, password);
        });
    }
    else {
        // authenticate directly
        authenticate(email, password);
    }
}

function authenticate(email, password) {
    var auth_data = constants.AUTH_DATA;
    var time = Date.now();
    auth_data['timestamp'] = time;
    auth_data['signature'] = calculate_signature(auth_data);
    auth_data['username'] = email;
    auth_data['password'] = password;

    var options = {
        method: 'POST',
        url: constants.SIGN_IN_URL,
        form: auth_data,
        jar: true
    };
    request(options, function(error, response, body) {
        var body_dict = JSON.parse(body);
        if (body_dict['error']) {
            reload_login_page(body_dict['error']['message']);
            return;
        }

        var access_expire = time + body_dict['expires_in'] * 1000;
        localStorage.setItem('access_token', body_dict['access_token']);
        localStorage.setItem('access_expire_time', access_expire.toString());

        $('.login-form').addClass('hidden');
        $('.logo').removeClass('hidden');

        const feed = require('./feed');
        feed.fetch_initial_feed();
    });
}

function calculate_signature(auth_data) {
    const crypto = require('crypto');
    var hmac = crypto.createHmac('sha1', constants.APP_SECRET);

    var msg = auth_data['grant_type'] + auth_data['client_id'] + auth_data['source'] 
        + auth_data['timestamp'];
    hmac.update(msg);
    return hmac.digest('hex');
}

function reload_login_page(message) {
    localStorage.setItem('login_error', message);

    var remote = require('electron').remote;
    remote.getCurrentWindow().reload();
}


exports.get_authorized_request_header = function () {
    // append access_token to base_request_header => authorized_request_header
    var access_token = localStorage.getItem('access_token');
    var header = constants.BASE_HEADER;
    header['Authorization'] = 'Bearer ' + access_token;
    return header;
}
