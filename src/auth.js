const crypto = require('crypto');
const request = require('request-promise');
const constants = require('./constants');

const current_window = require('electron').remote.getCurrentWindow();


exports.check_captcha = check_captcha;
async function check_captcha() {
    var options = {
        method: 'GET',
        url: constants.CAPTCHA_URL,
        headers: constants.CAPTCHA_REQUEST_HEADER,
        jar: true,
        json: true
    };
    var res = await request(options);
    if (res['show_captcha'])
        get_captcha();
}

async function get_captcha() {
    var options = {
        method: 'PUT',
        url: constants.CAPTCHA_URL,
        headers: constants.LOGIN_REQUEST_HEADER,
        jar: true,
        json: true
    };
    var res = await request(options);
    if ('error' in res) {
        check_captcha();
        return;
    }

    var image = new Image();
    image.src = 'data:image/gif;base64,' + res['img_base64'];
    $('.captcha').prepend(image);
    $('.captcha').removeClass('hidden');
}


exports.get_access_token = async function(email, password, captcha_text) {
    if (captcha_text) {
        // submit captcha text before authentication
        var options = {
            method: 'POST',
            url: constants.CAPTCHA_URL,
            headers: constants.LOGIN_REQUEST_HEADER,
            form: { input_text: captcha_text },
            jar: true,
            json: true
        };
        var res = await request(options);
        if (res['error']) {
            reload_login_page(res['error']['message']);
            return;
        }
    }
    await authenticate(email, password);
}

async function authenticate(email, password) {
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
        jar: true,
        json: true
    };
    var res = await request(options);
    if (res['error']) {
        reload_login_page(res['error']['message']);
        return;
    }

    localStorage.setItem('access_token', res['access_token']);
    localStorage.setItem('self_user_id', res['uid']);
    var access_expire = time + res['expires_in'] * 1000;
    localStorage.setItem('access_expire_time', access_expire.toString());

    $('.login-form').addClass('hidden');
    $('.logo').removeClass('hidden');
}

function calculate_signature(auth_data) {
    var hmac = crypto.createHmac('sha1', constants.APP_SECRET);
    var msg = auth_data['grant_type'] + auth_data['client_id'] + auth_data['source'] 
        + auth_data['timestamp'];
    hmac.update(msg);
    return hmac.digest('hex');
}

function reload_login_page(err_message) {
    localStorage.setItem('login_error', err_message);
    current_window.reload();
}


exports.get_authorized_request_header = function() {
    // append access_token to base_request_header
    var access_token = localStorage.getItem('access_token');
    var header = constants.BASE_HEADER;
    header['Authorization'] = 'Bearer ' + access_token;
    return header;
}
