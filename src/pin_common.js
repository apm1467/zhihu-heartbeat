const electron = require('electron');
const {clipboard} = electron;
const shell = electron.shell;
const {BrowserWindow, Menu} = electron.remote;
const constants = require('./constants');
const CommentsPage = require('./comments_page');
const image = require('./image');
const profile = require('./profile');

const current_window = electron.remote.getCurrentWindow();

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
        let container = $('.container');
        let scroll_position = container.scrollTop();
        if (scroll_position !== 0) {
            localStorage.setItem('last_scroll_position', scroll_position);
            container.animate({scrollTop: 0}, 300, 'easieEaseInOut');
        }
        else {
            let last_scroll_position = parseInt(
                localStorage.getItem('last_scroll_position'));
            if (last_scroll_position) 
                container.animate(
                    {scrollTop: last_scroll_position}, 300, 'easieEaseInOut');
        }
    }
}

// ------------------------------------------------------------

// deactivate title bar when window loses focus
{
    current_window.on('blur', function(event) {
        $('.title-bar').addClass('inactive');
    });
    current_window.on('focus', function(event) {
        $('.title-bar').removeClass('inactive');
    });
}

// ------------------------------------------------------------

// include extra CSS to adjust app scrollbar on Windows
{    
    if (process.platform === 'win32')
        current_window.webContents.insertCSS(constants.WINDOWS_EXTRA_CSS);
}

// ------------------------------------------------------------

// open links in external browser
{
    $(document).on('click', 'a[href^="http"]', function(event) {
        event.preventDefault();
        let a = $(this);
        let url = this.href;
        a.addClass('active').delay(500)
                            .queue(() => a.removeClass('active').dequeue());

        if (a.hasClass('comment_img') || a.hasClass('comment_sticker'))
            image.open_img_viewer([url], 0);
        else if (
            (a.parents('.profile').length === 0 &&
            url.startsWith(constants.PROFILE_WEB_URL)) || 
            a.hasClass('member_mention')
        ) {
            uid = url.slice(constants.PROFILE_WEB_URL.length + 1);
            profile.open_profile(uid);
        }
        else
            shell.openExternal(url, {activate: false});
    });
}

// ------------------------------------------------------------

// add highlight when pin author is clicked
{
    $(document).on('click', '.author a', function(event) {
        let author = $(this).closest('.comment-author, .author');
        author.addClass('active')
              .delay(500).queue(() => author.removeClass('active').dequeue());
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

// ------------------------------------------------------------

// open comments page for origin-pin
{
    $(document).on('click', '.origin-pin', function(event) {
        event.stopPropagation();
        let pin = $(this);
        if (
            !$(event.target).is('a, a span, .img, .thumbnail') &&
            !pin.hasClass('loading')
        ) {
            CommentsPage.open_comments_page(pin);
        }
    });
}

// ------------------------------------------------------------

// pin collapse
{
    // click pin to remove collapse
    $(document).on('click', '.pin', function(event) {
        if ($(event.target).is('a, a span, .img, .thumbnail'))
            return;

        let content = $(this).children('.content');
        content.removeClass('collapse');
        setTimeout(() => {
            content.css('max-height', 'none');
            content.children('.collapsed-indicator').addClass('hidden');
        }, 300);
    });
}

// ------------------------------------------------------------

// pin context menu
{
    $(document).on('contextmenu', '.pin, .origin-pin', function(event) {
        if ($(event.target).is('.img'))
            return;

        let pin = $(this);
        let template = [
            {
                label: '详情',
                click: () => CommentsPage.open_comments_page(
                    $(this).closest('.origin-pin, .pin'))
            },
            { type: 'separator' },
            {
                label: '复制想法链接',
                click: () => clipboard.writeText(
                    constants.PIN_WEB_URL + '/' + pin.attr('data-id'))
            }
        ];
        if (pin.outerHeight() > 350 && !pin.hasClass('origin-pin'))
            template.unshift({
                label: '折叠',
                click: () => toggle_collapse(pin)
            });

        let menu = Menu.buildFromTemplate(template);
        menu.popup({});
    });

    function toggle_collapse(pin) {
        let content = pin.children('.content');
        if (pin.outerHeight() < 350) {
            content.removeClass('collapse');
            setTimeout(() => content.css('max-height', 'none'), 300);
            return;
        }

        content.css('max-height', content.height());

        // maintain scroll position if pin is partially out of screen
        let container = $('.container');
        let scroll_top = container.scrollTop();
        let pin_h = pin.outerHeight(true);
        if (pin.offset().top < 0) {
            container.animate(
                {scrollTop: scroll_top - pin_h + 168}, 300, 'easieEaseOut');
        }

        content.addClass('collapse');
        content.children('.collapsed-indicator').removeClass('hidden');
    }
}