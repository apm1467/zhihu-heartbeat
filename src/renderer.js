const request = require('request');
const electron = require('electron');
const remote = electron.remote;
const shell = electron.shell;
const {app, dialog, BrowserWindow, Menu} = remote;
const Feed = require('./feed');
const {Pin} = require('./models');
const publish = require('./publish');
const constants = require('./constants');
const auth = require('./auth');
const image = require('./image');

const current_window = remote.getCurrentWindow();

// ------------------------------------------------------------

// login & fetch initial feed
{
    let login_error = localStorage.getItem('login_error');
    if (login_error) {
        $('.login-error').text(login_error);
        localStorage.removeItem('login_error');
    }

    let feed = new Feed();
    let access_expire = localStorage.getItem('access_expire_time');
    if (access_expire < Date.now())
        log_in();
    else
        feed.start();

    function log_in() {
        $('.logo').addClass('hidden');
        $('.login-form').removeClass('hidden');
        auth.check_captcha();

        $('.login-btn').click(async function() {
            $(this).fadeTo(200, 0);
            let email = $('.email').val();
            let password = $('.password').val();
            let captcha_text = $('.captcha-text').val();
            await auth.get_access_token(email, password, captcha_text);
            feed.start();
        });
    }
}

// ------------------------------------------------------------

// check app update
{
    request(constants.GITHUB_CHECK_UPDATE_URL, function(error, response, body) {
        let latest_version = body;
        let current_version = app.getVersion();
        if (current_version !== latest_version) {
            let options = {
                title: '检查更新',
                buttons: ['去下载', '取消'],
                defaultId: 0,
                cancelId: 1,
                message: '当前版本 ' + current_version + '，' + 
                         '最新版本 ' + latest_version + '，要去下载吗？'
            };
            dialog.showMessageBox(current_window, options, function(response) {
                if (response === 0)
                    shell.openExternal(constants.GITHUB_DOWNLOAD_URL);
            });
        }
    });
}

// ------------------------------------------------------------

// update post time of each pin every second
{
    setInterval(function() {
        let now = Math.round(Date.now() / 1000);
        $('.time').each(function() {
            let time_field = $(this);
            let post_time = parseInt(time_field.attr('data-time'));
            time_field.text(get_relative_time_str(post_time, now));
        });
    }, 1000);

    const sec_per_min = 60;
    const sec_per_hour = sec_per_min * 60;
    const sec_per_day = sec_per_hour * 24;
    const sec_per_week = sec_per_day * 7;

    function get_relative_time_str(post_time, now) {
        let diff = now - post_time;
        if (diff < sec_per_min)
            return diff + ' 秒前';
        if (diff < sec_per_hour)
            return Math.round(diff / sec_per_min) + ' 分前';
        if (diff < sec_per_day )
            return Math.round(diff / sec_per_hour) + ' 时前';
        if (diff < sec_per_week)
            return Math.round(diff / sec_per_day) + ' 日前';
        // fall back to display full date
        let date = new Date(post_time * 1000);
        return `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
    }
}

// ------------------------------------------------------------

// update statistics of each pin every 10 min
{
    setInterval(function() {
        $('.pin').each(function() {
            Pin.update_statistics($(this).attr('data-id'));
        });
    }, constants.PIN_STATISTICS_UPDATE_INTERVAL);
}

// ------------------------------------------------------------

// click logo to publish new pin
{
    $('.logo').click(() => publish.open_editor());
}

// ------------------------------------------------------------

// double click title bar to scroll top
{
    $(document).on('dblclick', '.title-bar', function(event) {
        if ($(event.target).is('.logo, i'))
            return;

        scroll_to_top();
    });

    // scroll to top if currently not at top;
    // scroll back to the last scroll position if currently at top
    function scroll_to_top() {
        let container = $('.feed-container');
        let scroll_position = container.scrollTop();
        if (scroll_position !== 0) {
            localStorage.setItem('last_scroll_position', scroll_position);
            container.animate({scrollTop: 0}, 300, 'easieEaseInOut');
        }
        else {
            let last_scroll_position = parseInt(localStorage.getItem('last_scroll_position'));
            if (last_scroll_position)
                container.animate({scrollTop: last_scroll_position}, 300, 'easieEaseInOut');
        }
    }
}

// ------------------------------------------------------------

// click delete button to delete pin
{
    $(document).on('click', '.delete-btn', function(event) {
        let clicked_btn = $(this);
        let delete_menu = Menu.buildFromTemplate([
            {
                label: '删除',
                click: function() {
                    clicked_btn.fadeOut(200);
                    let pin_id = clicked_btn.parent().parent().attr('data-id');
                    Pin.delete(pin_id);
                }
            }
        ]);
        delete_menu.popup({});
    });
}

// ------------------------------------------------------------

// click heart button to like pin
{
    $(document).on('click', '.num-likes', async function(event) {
        let clicked_btn = $(this);
        let pin_id = clicked_btn.parent().parent().attr('data-id');
        let is_liked = clicked_btn.find('i.fas.fa-heart').length !== 0;
        clicked_btn.fadeTo(200, 0);
        if (is_liked)
            await Pin.unlike(pin_id);
        else
            await Pin.like(pin_id);
        clicked_btn.fadeTo(200, 1);
    });
}

// ------------------------------------------------------------

// pin focus & context menu
{
    // click pin to add focus & remove collapse
    $(document).on('click contextmenu', '.pin', function(event) {
        // not add focus when clicking links or images
        if ($(event.target).is('a, a span, .img, .thumbnail'))
            return;

        let pin = $(this);
        let pin_content = pin.children('.content');
        pin_content.removeClass('collapse');
        setTimeout(() => pin_content.css('max-height', 'none'), 300);

        if (!pin.hasClass('focus')) {
            $('.pin').removeClass('focus');
            pin.addClass('focus');
        }
    });

    // click title bar to remove focus
    $(document).on('click contextmenu', '.title-bar', function(event) {
        $('.pin').removeClass('focus');
    });

    // double click pin to open comments window
    $(document).on('dblclick', '.pin', function(event) {
        // not trigger this event when clicking links or images
        if (!$(event.target).is('a, a span, .img, .thumbnail'))
            open_comments_window($(this));
    });

    // prevent text selection after double click
    $(document).on('mousedown', '.pin', function(event) {
        if (event.detail > 1)
            event.preventDefault();
    });

    // context menu
    $(document).on('contextmenu', '.pin', function(event) {
        if ($(event.target).is('.img'))
            return;

        let pin = $(this);
        let template = [{
            label: '详情',
            click: () => open_comments_window(pin)
        }];

        // make long pins collapsible
        if (pin.outerHeight() > 400)
            template.unshift({
                label: '折叠',
                click: () => toggle_collapse(pin)
            });

        let menu = Menu.buildFromTemplate(template);
        menu.popup({});
    });

    function open_comments_window(pin) { // jQuery object
        pin.addClass('loading');

        let pin_id = pin.attr('data-id');
        let pin_html = pin.html();
        let win = new BrowserWindow({
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

            pin.removeClass('loading');
            win.show();
        });
    }

    function toggle_collapse(pin) {
        let pin_content = pin.children('.content');
        if (pin.outerHeight() < 400) {
            pin_content.removeClass('collapse');
            setTimeout(() => pin_content.css('max-height', 'none'), 300);
            return;
        }

        pin_content.css('max-height', pin_content.height());

        // maintain scroll bar position if pin is partially out of screen
        let container = $('.feed-container');
        let scroll_top = container.scrollTop();
        let pin_h = pin.outerHeight(true);
        if (pin.offset().top < 0)
            container.animate({scrollTop: scroll_top - pin_h + 168}, 300, 'easieEaseOut');

        pin_content.addClass('collapse');
    }
}

// ------------------------------------------------------------

// accept keyboard shortcuts
{
    window.addEventListener('keydown', (event) => {
        let pin_focused = $('.focus');
        let has_focus = pin_focused.length === 1;
        switch (event.key) {
            case ' ': // space bar
            case 'Enter':
                event.preventDefault();
                if (has_focus)
                    pin_focused.click(); // unfold & add focus
                    open_comments_window(pin_focused);
                break;
            case 'Escape':
                $('.pin').removeClass('focus');
                break;
            case 'm':
                toggle_collapse(pin_focused);
                break;
            case 'i':
                if (has_focus) {
                    let media = pin_focused.find('.img, .video .thumbnail');
                    media.first().click();
                }
                break;
            case 's':
                if (has_focus)
                    pin_focused.find('.num-likes').click(); // click heart button
                break;
            case 'k':
            case 'ArrowUp':
                if (has_focus && is_in_viewport(pin_focused)) {
                    pin_focused.removeClass('focus');
                    move_focus(pin_focused.prev());
                }
                else {
                    $($('.pin').get().reverse()).each(function() {
                        let pin = $(this);
                        if (is_in_viewport(pin)) {
                            $('.pin').removeClass('focus');
                            pin.addClass('focus');
                            return false;
                        }
                    });
                }
                break;
            case 'j':
            case 'ArrowDown':
                if (has_focus && is_in_viewport(pin_focused)) {
                    pin_focused.removeClass('focus');
                    move_focus(pin_focused.next());
                }
                else {
                    $('.pin').each(function() {
                        let pin = $(this);
                        if (is_in_viewport(pin)) {
                            $('.pin').removeClass('focus');
                            pin.addClass('focus');
                            return false;
                        }
                    });
                }
                break;
            case 'g':
                scroll_to_top();
                break;
        }
    });

    function is_in_viewport(pin) {
        let top = pin.offset().top - 55;
        let bottom = top + pin.outerHeight(true);
        let container_h = $('.feed-container').height();
        return !(bottom < 0 || top > container_h);
    }

    function move_focus(pin) {
        pin.addClass('focus');
        let top = pin.offset().top - 50;
        let bottom = top + pin.outerHeight(true);
        let container = $('.feed-container');
        let scroll_top = container.scrollTop();
        if (top < 0 || bottom > container.height())
            container.animate({scrollTop: scroll_top + top}, 300, 'easieEaseInOut');
    }
}

// ------------------------------------------------------------

// click self avatar to open logout menu
{
    const logout_menu = Menu.buildFromTemplate([
        {
            label: '重载界面',
            click: () => current_window.reload()
        },
        {
            label: '意见反馈',
            click: () => shell.openExternal(constants.GITHUB_ISSUES_URL)
        },
        { type: 'separator' },
        {
            label: '登出知乎',
            click: () => {
                localStorage.clear();
                current_window.reload();
            }
        }
    ]);
    $(document).on('click contextmenu', '.self-avatar', 
                   () => logout_menu.popup({}));
}

// ------------------------------------------------------------

// open links in external browser
{
    $(document).on('click', 'a[href^="http"]', function(event) {
        event.preventDefault();
        let a = $(this);
        a.addClass('active').delay(500).queue(() => a.removeClass('active').dequeue());
        shell.openExternal(this.href, {activate: false});
    });
}

// ------------------------------------------------------------

// open timeline images
{
    // click to open images in new window
    $(document).on('click', '.img', function(event) {
        let img = $(this);

        // img is already loading
        if (img.hasClass('darkened'))
            return;

        // mark img as loading
        img.addClass('darkened');

        let urls = get_img_urls(img);
        let index_clicked = img.attr('data-index');
        image.open_img_viewer(urls, index_clicked);
    });

    $(document).on('contextmenu', '.img', function(event) {
        let img = $(this);
        let urls = get_img_urls(img);
        let index_clicked = img.attr('data-index');
        image.open_img_context_menu(urls, index_clicked, img);
    });

    function get_img_urls(img) {
        let urls;
        if (img.hasClass('single-img'))
            urls = [img.attr('src')];
        else {
            let imgs;
            if (img.hasClass('double-img'))
                imgs = img.parent().children('.img');
            else
                imgs = img.parent().parent().find('.img');

            urls = imgs.map(function () {
                return $(this).attr('data-url');
            }).get();
        }
        return urls.map((url) => url.replace(/_[a-z]+/, '_qhd'));
    }
}

// ------------------------------------------------------------

// open timeline videos
{
    // open video in new window
    $(document).on('click', '.video .thumbnail', function(event) {
        let video = $(this).parent();

        // prevent opening window multiple times on double click
        if (video.hasClass('darkened'))
            return;

        video.addClass('darkened');

        let pin_id = video.parent().parent().attr('data-id');
        let video_url = video.attr('data-url');
        let width = parseInt(video.attr('data-width'));
        let height = parseInt(video.attr('data-height'));

        let player_win = new BrowserWindow({
            titleBarStyle: 'hidden',
            show: false,
            height: height,
            width: width,
            backgroundColor: "#000",
            autoHideMenuBar: true,
            useContentSize: true
        });
        player_win.loadFile('src/video_player.html');

        // pass video url to player window
        player_win.webContents.on('did-finish-load', () =>
            player_win.webContents.send('video', video_url, pin_id)
        );

        player_win.once('ready-to-show', () => {
            player_win.show();
            $('.video').removeClass('darkened'); // remove darkening
        });
    });
}
