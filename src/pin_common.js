const electron = require('electron');
const shell = electron.shell;
const constants = require('./constants');
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
            url.startsWith(constants.PROFILE_WEB_URL) || 
            a.hasClass('member_mention')
        ) {
            uid = url.slice(constants.PROFILE_WEB_URL.length);
            profile.open_profile(uid);
        }
        else
            shell.openExternal(url, {activate: false});
    });
}

// ------------------------------------------------------------

// add shadow when pin author is clicked
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
