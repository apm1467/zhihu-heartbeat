const crypto = require('crypto');
const request = require('request-promise');
const constants = require('./constants');

const current_window = require('electron').remote.getCurrentWindow();


exports.check_captcha = check_captcha;
async function check_captcha() {
    var res = await request({
        method: 'GET',
        url: constants.CAPTCHA_URL,
        headers: constants.CAPTCHA_REQUEST_HEADER,
        jar: true,
        simple: false,
        json: true
    });
    if (res['show_captcha'])
        get_captcha();
}

async function get_captcha() {
    var res = await request({
        method: 'PUT',
        url: constants.CAPTCHA_URL,
        headers: constants.LOGIN_REQUEST_HEADER,
        jar: true,
        simple: false,
        json: true
    });
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
            simple: false,
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
    var time = Date.now();
    var auth_data = {
        ...constants.AUTH_DATA,
        signature: calculate_signature(time),
        timestamp: time,
        username: email,
        password: password
    }

    var res = await request({
        method: 'POST',
        url: constants.SIGN_IN_URL,
        form: auth_data,
        jar: true,
        simple: false,
        json: true
    });
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

function calculate_signature(time) {
    var {grant_type, client_id, source} = constants.AUTH_DATA;
    var hmac = crypto.createHmac('sha1', constants.APP_SECRET);
    var msg = grant_type + client_id + source + time;
    hmac.update(msg);
    return hmac.digest('hex');
}

function reload_login_page(err_message) {
    localStorage.setItem('login_error', err_message);
    current_window.reload();
}


exports.get_authorized_request_header = function() {
    var access_token = 'Bearer ' + localStorage.getItem('access_token');
    return {...constants.BASE_HEADER, Authorization: access_token};
}
