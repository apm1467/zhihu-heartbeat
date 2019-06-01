const electron = require('electron');
const {clipboard} = electron;
const shell = electron.shell;
const {BrowserWindow, Menu} = electron.remote;
const constants = require('./constants');
const CommentsPage = require('./comments_page');
const {Pin} = require('./models');
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

        if (
            a.hasClass('comment_img') ||
            a.hasClass('comment_sticker') ||
            a.hasClass('comment_gif')
        )
            image.open_img_viewer([url], 0);
        else if (
            a.hasClass('member_mention') ||
            url.startsWith(constants.PROFILE_WEB_URL) &&
            a.parents('.profile').length === 0
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
        Pin.uncollapse($(this).attr('data-id'));
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
                click: () => Pin.collapse(pin.attr('data-id'))
            });

        let menu = Menu.buildFromTemplate(template);
        menu.popup({});
    });
}

// ------------------------------------------------------------

// pin focus
{
    // click pin to add focus
    $(document).on('click contextmenu', '.feed .pin', function(event) {
        if ($(event.target).is('a, a span, .img, .thumbnail'))
            return;
        let pin = $(this);
        if (!pin.hasClass('focus')) {
            $('.focus').removeClass('focus');
            pin.addClass('focus');
        }
    });

    // click title bar to remove focus
    $(document).on('click contextmenu', '.title-bar', function(event) {
        $('.focus').removeClass('focus');
    });

    // double click pin to open comments page
    $(document).on('dblclick', '.feed .pin', function(event) {
        if ($(event.target).is('a, a span, .img, .thumbnail'))
            return;
        CommentsPage.open_comments_page($(this));
    });

    // prevent text selection after double click
    $(document).on('mousedown', '.feed .pin', function(event) {
        if (event.detail > 1)
            event.preventDefault();
    });

    // prevent double click on origin-pin from opening comments page
    $(document).on('dblclick', '.origin-pin', function(event) {
        event.stopPropagation();
    });
}
