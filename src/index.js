const request = require('request');
const electron = require('electron');
const remote = electron.remote;
const shell = electron.shell;
const ipc = electron.ipcRenderer;
const {app, dialog, BrowserWindow, Menu} = remote;
const Feed = require('./feed');
const {Pin} = require('./models');
const pin_publish = require('./pin_publish');
const constants = require('./constants');
const CommentsPage = require('./comments_page');
const auth = require('./auth');

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

// update pin statistics
{
    // update all pin statistics every 10 min
    setInterval(function() {
        $('.pin').each(function() {
            Pin.update_statistics($(this).attr('data-id'));
        });
    }, constants.PIN_STATISTICS_UPDATE_INTERVAL);

    // update on demand
    ipc.on('update-pin-statistics', function(event, pin_id) {
        Pin.update_statistics(pin_id);
    });
}

// ------------------------------------------------------------

// click logo to publish new pin
{
    $(document).on('click', '.logo', function(event) {
        let logo = $(this);
        logo.addClass('active')
            .delay(400).queue(() => logo.removeClass('active').dequeue());
        pin_publish.open_editor();
    });
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
    // click pin to add focus
    $(document).on('click contextmenu', '.pin', function(event) {
        // not add focus when clicking links or images
        if ($(event.target).is('a, a span, .img, .thumbnail'))
            return;

        let pin = $(this);
        if (!pin.hasClass('focus')) {
            $('.pin').removeClass('focus');
            pin.addClass('focus');
        }
    });

    // click title bar to remove focus
    $(document).on('click contextmenu', '.title-bar', function(event) {
        $('.pin').removeClass('focus');
    });

    // double click pin to open comments page
    $(document).on('dblclick', '.pin', function(event) {
        if (!$(event.target).is('a, a span, .img, .thumbnail'))
            CommentsPage.open_comments_page($(this));
    });

    // prevent text selection after double click
    $(document).on('mousedown', '.pin', function(event) {
        if (event.detail > 1)
            event.preventDefault();
    });

    // prevent double click on origin-pin from opening comments page for repin
    $(document).on('dblclick', '.origin-pin', function(event) {
        event.stopPropagation();
    });
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
                    CommentsPage.open_comments_page(pin_focused);
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
        let container_h = $('.container').height();
        return !(bottom < 0 || top > container_h);
    }

    function move_focus(pin) {
        pin.addClass('focus');
        let top = pin.offset().top - 50;
        let bottom = top + pin.outerHeight(true);
        let container = $('.container');
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
    $(document).on('click contextmenu', '.self-avatar', function(event) {
        event.preventDefault();
        let avatar = $(this);
        avatar.addClass('darkened');
        logout_menu.popup({callback: () => avatar.removeClass('darkened')});
    });
}
