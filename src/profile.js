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
        User.update_profile(this.uid);

        let feed = new Feed(this.uid);
        feed.start();

        require('./pin_common');
    }
}

module.exports = {open_profile, ProfilePage};
