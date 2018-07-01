var request = require('request');
const constants = require('./constants');
const auth = require('./auth');


exports.open_editor = function () {
    const {BrowserWindow} = require('electron').remote;
    var win = new BrowserWindow({
        show: false,
        resizable: false,
        height: 550,
        width: 400,
        titleBarStyle: 'hiddenInset',
        maximizable: false,
        backgroundColor: "#484848",
        useContentSize: true
    });

    win.loadFile('editor.html');

    win.once('ready-to-show', function () {
        win.show();
    });

    win.on('closed', function () {
        win = null;
    });
}

exports.publish = function (text, editor_window) {
    var options = {
        method: 'GET',
        url: constants.PIN_TOKEN_URL,
        headers: auth.get_authorized_request_header(),
        jar: true
    };
    request(options, function(error, response, body) {
        var pin_token = JSON.parse(body)['token'];
        var publish_form = constants.PIN_PUBLISH_FORM;
        publish_form['token'] = pin_token;

        var content_form = constants.PIN_PUBLISH_CONTENT_FORM;
        content_form[0]['randomTag'] = generate_random_tag();
        content_form[0]['content'] = escape_html(text);
        publish_form['content'] = JSON.stringify(content_form);

        var options = {
            method: 'POST',
            url: constants.PIN_POST_URL,
            headers: auth.get_authorized_request_header(),
            jar: true,
            form: publish_form
        };
        request(options, function(error, response, body) {
            if (!('error' in JSON.parse(body))) {
                // only close editor window after request succeeds
                editor_window.close();
            }
        });
    });
}

function escape_html(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/\n/g, '<br>');
}

function generate_random_tag() {
    // random int between 100 and 9999
    var min = 100;
    var max = 9999;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

