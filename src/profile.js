const request = require('request-promise-native');
const electron = require('electron');
const {BrowserWindow} = electron.remote;
const auth = require('./auth');
const Feed = require('./feed');
const {User} = require('./models');

const current_window = electron.remote.getCurrentWindow();


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
        win.webContents.send('parent-win-id', current_window.webContents.id);
        win.show();
    });
}

class ProfilePage {
    constructor(uid) {
        this.uid = uid;
    }

    async start() {
        let feed = new Feed(this.uid);
        feed.start();
        await User.update_profile(this.uid);
        $('.profile .author .name').append(
            '<i class="fas fa-link hidden"></i>');
    }
}

module.exports = {open_profile, ProfilePage};
