const request = require('request-promise-native');
const {BrowserWindow} = require('electron').remote;
const auth = require('./auth');
const Feed = require('./feed');
const {User} = require('./models');


function open_profile(uid) {
    let win = new BrowserWindow({
        width: 450,
        minWidth: 400,
        maxWidth: 600,
        height: 800,
        titleBarStyle: 'hiddenInset',
        backgroundColor: "#2C2924",
        autoHideMenuBar: true,
        fullscreenable: false,
        show: false,
        useContentSize: true
    });
    win.loadFile('src/profile.html');

    win.webContents.on('did-finish-load', function() {
        win.webContents.send('uid', uid);
        win.show();
    });
}

class ProfilePage {
    constructor(uid) {
        this.uid = uid;
    }

    async start() {
        this._display_user();

        let feed = new Feed(this.uid);
        feed.start();
    }

    async _display_user() {
        let res = await request({
            method: 'GET',
            url: `${constants.PROFILE_URL}/${this.uid}`,
            headers: auth.get_authorized_request_header(),
            jar: true,
            json: true
        });
        if ('error' in res) {
            this._display_user();
            return;
        }

        let user = new User(res);
        $('.title').append(user.name);
        $('.author').append(user.get_html());
        $('.content').append(user.bio);
        $('.followers').append(user.followers);
        $('.following').append(user.following);
        $('.num-pins').append(user.num_pins);

        if (user.follows_me) {
            $('.follows-me').removeClass('hidden');
            $('.profile .content').css({'margin-right': '135px'});
        }

        if (user.followed_by_me) {
            $('.follow-btn').append('已关注');
            $('.follow-btn').addClass('followed-by-me');
        }
        else {
            $('.follow-btn').append('关注');
        }
    }
}

module.exports = {open_profile, ProfilePage};
