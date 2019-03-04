const {dialog, BrowserWindow} = require('electron').remote;
const request = require('request-promise-native');
const constants = require('./constants');
const auth = require('./auth');


exports.open_editor = function() {
    let win = new BrowserWindow({
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
    win.once('ready-to-show', () => win.show());
    win.on('closed', () => win = null);
}

exports.publish = async function(text, editor_window) {
    let token_res = await request({
        method: 'GET',
        url: constants.PIN_TOKEN_URL,
        headers: auth.get_authorized_request_header(),
        jar: true,
        json: true
    });
    let token = token_res['token'];

    let content_form = constants.PIN_PUBLISH_CONTENT_FORM;
    content_form[0]['randomTag'] = generate_random_tag();
    content_form[0]['content'] = escape_html(text);

    let publish_form = constants.PIN_PUBLISH_FORM;
    publish_form['token'] = token;
    publish_form['content'] = JSON.stringify(content_form);

    let publish_res = await request({
        method: 'POST',
            url: constants.PIN_URL,
            headers: auth.get_authorized_request_header(),
            form: publish_form,
            jar: true,
            simple: false,
            json: true
    });
    if ('error' in publish_res) {
        console.log(publish_res);
        dialog.showMessageBox(editor_window, {
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
    let min = 100;
    let max = 9999;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

