const fs = require('fs');
const request = require('request');
const electron = require('electron');
const remote = electron.remote;
const ipc = electron.ipcRenderer;
const {app, dialog, BrowserWindow, Menu, MenuItem} = remote;
const Feed = require('./feed');
const {Pin} = require('./models');
const publish = require('./publish');
const constants = require('./constants');
const auth = require('./auth');

const current_window = remote.getCurrentWindow();


// initialize the main window
var login_error = localStorage.getItem('login_error');
if (login_error) {
    $('.login-error').text(login_error);
    localStorage.removeItem('login_error');
}

const feed = new Feed();

var access_expire_time = localStorage.getItem('access_expire_time');
if (access_expire_time < Date.now()) {
    log_in();

    // wait for message from auth
    ipc.on('auth_finished', function (event) {
        feed.start();
    });
}
else {
    feed.start();
}

function log_in() {
    $('.logo').addClass('hidden');

    const auth = require('./auth');
    auth.check_captcha();

    $('.login-btn').click(function () {
        $(this).fadeTo(200, 0);
        var email = $('.email').val();
        var password = $('.password').val();
        var captcha_text = $('.captcha-text').val();
        auth.get_access_token(email, password, captcha_text);
    });

    $('.login-form').removeClass('hidden');
}

// ------------------------------------------------------------

// check app update
var current_version = 'v' + app.getVersion();
var options = {
    method: 'GET',
    url: constants.GITHUB_CHECK_UPDATE_URL,
    headers: {'User-Agent': 'apm1467/zhihu-heartbeat'}
};
request(options, function(error, response, body) {
    var latest_version = JSON.parse(body)['tag_name'];
    if (current_version != latest_version) {
        var prompt = '当前版本 ' + current_version + '，' + 
                     '最新版本 ' + latest_version + '，要去下载吗？';
        var options = {
            title: '检查更新',
            buttons: ['去下载', '取消'],
            defaultId: 0,
            cancelId: 1,
            message: prompt
        }
        dialog.showMessageBox(current_window, options, function(response) {
            if (response === 0) {
                shell.openExternal(constants.GITHUB_DOWNLOAD_URL);
            }
        }); 
    }
});

// ------------------------------------------------------------

// update post time of each feed-item every second
setInterval(function() {
    const now = Math.round(Date.now() / 1000);

    $('.time').each(function () {
        var post_time = parseInt($(this).attr('data-time'));
        $(this).text(get_relative_time_str(post_time, now));
    });
}, 1000);

const sec_per_min = 60;
const sec_per_hour = sec_per_min * 60;
const sec_per_day = sec_per_hour * 24;
const sec_per_week = sec_per_day * 7;

function get_relative_time_str(post_time, now) {
    var diff = now - post_time;

    if (diff < sec_per_min) {
        return diff + ' 秒前';
    }
    else if (diff < sec_per_hour) {
        return Math.round(diff / sec_per_min) + ' 分前';
    }
    else if (diff < sec_per_day ) {
        return Math.round(diff / sec_per_hour) + ' 时前';
    }
    else if (diff < sec_per_week) {
        return Math.round(diff / sec_per_day) + ' 日前';
    }
    else {
        date = new Date(post_time * 1000);
        return date.getMonth() + ' 月 ' + date.getDate() + ' 日';
    }
}

// ------------------------------------------------------------

// update statistics of each feed-item every 10 min
setInterval(function() {
    $('.feed-item').each(function () {
        Feed.update_pin_statistics($(this).attr('data-id'));
        console.log('statistics updated');
    });
}, constants.PIN_STATISTICS_UPDATE_INTERVAL);

// ------------------------------------------------------------

// click logo to publish new pin
$('.logo').click(function () {
    publish.open_editor();
});

// ------------------------------------------------------------

// click delete button to open delete pin menu
$(document).on('click', '.delete-btn', function(event) {
    var clicked_btn = $(this);
    var delete_menu = Menu.buildFromTemplate([
        {
            label: '删除',
            click: function() {
                clicked_btn.fadeOut(200);
                var pin_id = clicked_btn.parent().parent().attr('data-id');
                Feed.delete_pin(pin_id);
            }
        }
    ]);
    delete_menu.popup(current_window);
});

// ------------------------------------------------------------

// click feed item to add focus
$(document).on('click contextmenu', '.feed-item', function(event) {
    var feed_item = $(this);

    // not trigger this event when clicking links or images
    if ($(event.target).is('a, a span, .img, .thumbnail'))
        return;

    if (!feed_item.hasClass('focus')) {
        $('.feed-item').removeClass('focus');
        feed_item.addClass('focus');
    }
});

// double click feed item to open comments window
$(document).on('dblclick', '.feed-item', function(event) {
    // not trigger this event when clicking links or images
    if ($(event.target).is('a, a span, .img, .thumbnail'))
        return;

    var feed_item = $(this);
    open_comments_window(feed_item);
});

// right click on feed item to open comments window
$(document).on('contextmenu', '.feed-item', function(event) {
    if ($(event.target).is('.img'))
        return;

    var feed_item = $(this);
    const feed_item_menu = Menu.buildFromTemplate([
        {
            label: '详情',
            click: function() {
                open_comments_window(feed_item);
            }
        }
    ]);
    feed_item_menu.popup(current_window);
});

function open_comments_window(feed_item) { // accept jQuery object
    window.getSelection().empty();
    feed_item.addClass('loading');

    var pin_id = feed_item.attr('data-id');
    var pin_html = feed_item.html()

    var win = new BrowserWindow({
        width: 450,
        minWidth: 400,
        maxWidth: 600,
        height: 800,
        titleBarStyle: 'hiddenInset',
        backgroundColor: "#333333",
        autoHideMenuBar: true,
        fullscreenable: false,
        show: false,
        useContentSize: true
    });

    win.loadFile('src/comments.html');

    win.webContents.on('did-finish-load', function() {
        // pass pin_id to comments window
        win.webContents.send('pin', pin_id, pin_html);

        feed_item.removeClass('loading');
        win.show();
    });
}

// ------------------------------------------------------------

// click self avatar to open logout menu
const logout_menu = Menu.buildFromTemplate([
    {
        label: '重载界面',
        click: function() {
            current_window.reload();
        }
    },
    {
        type: 'separator'
    },
    {
        label: '登出知乎',
        click: function() {
            localStorage.clear();
            current_window.reload();
        }
    }
]);
$(document).on('click', '.self-avatar', function(event) {
    logout_menu.popup(current_window);
});

// ------------------------------------------------------------

// open links in external browser
const shell = require('electron').shell;
$(document).on('click', 'a[href^="http"]', function(event) {
    event.preventDefault();
    shell.openExternal(this.href, {activate: false});
});

// ------------------------------------------------------------

// click to open feed images in new window
$(document).on('click', '.img', function(event) {
    // prevent opening window multiple times on double click
    if ($(this).hasClass('darkened'))
        return;

    // darken the image thumbnail while load image window
    $(this).addClass('darkened');

    var img = new Image();
    img.src = get_img_url($(this));
    img.onload = function() {
        // calculate image window size
        var win_height = this.height;
        var win_width = this.width;
        var img_html_attr = '';

        // get current screen size
        const current_screen = electron.screen.getDisplayMatching(current_window.getBounds());
        const screen_w = current_screen.workAreaSize.width;
        const screen_h = current_screen.workAreaSize.height;

        // image is larger than screen
        if (screen_w < this.width || screen_h < this.height) {
            const max_window_w = Math.ceil(screen_w * 0.95);
            const max_window_h = Math.ceil(screen_h * 0.9);

            var aspect_ratio = this.width / this.height;
            if (aspect_ratio <= 0.45) {
                // image is very tall; allow scroll in vertical direction
                img_html_attr = 'width="100%"';
                win_width = Math.min(max_window_w, this.width);
                win_height = Math.ceil(win_width / aspect_ratio);
            }
            else {
                // normal aspect ratio; display image on screen enitrely
                img_html_attr = 'width="100%" height="100%"';
                win_height = Math.min(max_window_h, this.height);
                win_width = Math.ceil(win_height * aspect_ratio);

                if (win_width > screen_w) {
                    // image is very wide; adjust window size according to screen width
                    win_width = max_window_w;
                    win_height = Math.ceil(win_width / aspect_ratio);
                }
            }
        }

        // open image window
        var win = new BrowserWindow({
            titleBarStyle: 'hidden',
            show: false,
            height: win_height,
            width: win_width,
            backgroundColor: "#000",
            autoHideMenuBar: true,
            fullscreenable: false,
            useContentSize: true
        });

        win.loadURL('data:text/html,' +
                    '<body style="-webkit-app-region: drag; margin: 0;">' +
                    '<img draggable="false" ' + img_html_attr + ' src="' + this.src + '">' +
                    '</body>');

        win.once('ready-to-show', function () {
            win.show();
            $('.img').removeClass('darkened');
        });

        win.on('closed', function () {
            win = null;
        });
    };
});

// right click to save feed images
$(document).on('contextmenu', '.img', function(event) {
    var img_url = get_img_url($(this));
    var desktop_path = app.getPath('desktop') + '/';
    var file_name = Date.now() + '.jpg';
    const save_img_menu = Menu.buildFromTemplate([
        {
            label: '保存原图到桌面',
            click: function() {
                request(img_url).pipe(fs.createWriteStream(desktop_path + file_name));
            }
        },
        {
            label: '保存原图到…',
            click: function() {
                current_window.focus();
                var path = dialog.showSaveDialog({
                    title: '保存原图',
                    defaultPath: file_name,
                    filters: [{ extensions: ['jpg'] }]
                });
                if (path) {
                    request(img_url).pipe(fs.createWriteStream(path));
                }
            }
        }
    ]);

    save_img_menu.popup(current_window);
});

function get_img_url(img_obj) { // accept jQuery object
    var img_url;
    if (img_obj.hasClass('single-img')) {
        img_url = img_obj.attr('src');
    }
    else {
        img_url = img_obj.css('background-image').slice(4, -1).replace(/"/g, "");
    }
    img_url = img_url.replace(/_[a-z]+/, ""); // get original image

    return img_url;
}

// ------------------------------------------------------------

// open video in new window
$(document).on('click', '.video', function(event) {
    // prevent opening window multiple times on double click
    if ($(this).hasClass('darkened'))
        return;

    $(this).addClass('darkened');

    var pin_id = $(this).parent().parent().attr('data-id');
    var video_url = $(this).attr('data-url');
    var width = parseInt($(this).attr('data-width'));
    var height = parseInt($(this).attr('data-height'));

    var win = new BrowserWindow({
        titleBarStyle: 'hidden',
        show: false,
        height: height,
        width: width,
        backgroundColor: "#000",
        autoHideMenuBar: true,
        useContentSize: true
    });
    win.loadFile('src/video_player.html');

    // pass video url to player window
    win.webContents.on('did-finish-load', function() {
        win.webContents.send('video', video_url, current_window.id);
    });

    win.once('ready-to-show', function() {
        win.show();
        $('.video').removeClass('darkened'); // remove darkening
    });

    // refresh video url on error
    ipc.on('video_outdated', function(event) {
        var options = {
            method: 'GET',
            url: constants.PIN_URL + '/' + pin_id,
            headers: auth.get_authorized_request_header(),
            jar: true
        };
        request(options, function(error, response, body) {
            var video_url = (new Pin(JSON.parse(body))).video;
            win.webContents.send('video', video_url, current_window.id);
        });
    });
});
