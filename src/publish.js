const remote = require('electron').remote;
const {dialog, BrowserWindow} = remote;
const request = require('request-promise');
const constants = require('./constants');
const auth = require('./auth');

const current_window = remote.getCurrentWindow();


exports.open_editor = function () {
    var win = new BrowserWindow({
        show: false,
        resizable: false,
        height: 550,
        width: 400,
        titleBarStyle: 'hiddenInset',
        maximizable: false,
        autoHideMenuBar: true,
        backgroundColor: "#333333",
        useContentSize: true
    });

    win.loadFile('src/pin_editor.html');

    win.once('ready-to-show', function () {
        win.show();
    });

    win.on('closed', function () {
        win = null;
    });
}

exports.publish = async function (text, editor_window) {
    var token_res = await request({
        method: 'GET',
        url: constants.PIN_TOKEN_URL,
        headers: auth.get_authorized_request_header(),
        jar: true,
        json: true
    });
    var token = token_res['token'];
    var publish_form = constants.PIN_PUBLISH_FORM;
    publish_form['token'] = token;

    var content_form = constants.PIN_PUBLISH_CONTENT_FORM;
    content_form[0]['randomTag'] = generate_random_tag();
    content_form[0]['content'] = escape_html(text);
    publish_form['content'] = JSON.stringify(content_form);

    var publish_res = await request({
        method: 'POST',
            url: constants.PIN_URL,
            headers: auth.get_authorized_request_header(),
            form: publish_form,
            jar: true,
            json: true
    });

    if ('error' in publish_res) {
        console.log(response);
        dialog.showMessageBox(current_window, {
            type: 'error',
            message: publish_res['error']
        });
    }
    else
        editor_window.close();
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

