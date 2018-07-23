const fs = require('fs');
const path = require('path');
const request = require('request');
const {app, BrowserWindow, Menu, dialog} = require('electron');
const shell = require('electron').shell;
try {
    require('electron-reloader')(module);
} catch (err) {}
const constants = require('./constants');

const window_bounds_path = path.join(app.getPath('userData'), 'window_bounds.json');


let main_window = null;

// create main window
app.on('ready', function() {
    main_window = new BrowserWindow({
        width: 430,
        minWidth: 400,
        maxWidth: 600,
        height: 800,
        titleBarStyle: 'hiddenInset',
        backgroundColor: "#484848",
        fullscreenable: false,
        useContentSize: true
    });

    // restore window bounds
    try {
        var bounds = JSON.parse(fs.readFileSync(window_bounds_path, 'utf8'));
    }
    catch (err) {}
    if (bounds) {
        main_window.setBounds(bounds);
    }

    main_window.loadFile('index.html');

    // hide the main window instead of closing in on macOS
    if (process.platform === 'darwin') {
        // user can still quit the app normally
        var user_quit = false;
        app.on('before-quit', function() {
            user_quit = true;
        });

        main_window.on('close', function(event) {
            if (!user_quit) {
                event.preventDefault();
                main_window.hide();
                return false;
            }
        });
    }

    // save window bounds
    main_window.on('close', function(event) {
        var bounds = main_window.getBounds();
        fs.writeFileSync(window_bounds_path, JSON.stringify(bounds));
    });

    main_window.on('closed', function() {
        main_window = null;
    });
});

// create app menu
app.once('ready', function() {
    const template = [
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'pasteandmatchstyle' },
                { role: 'delete' },
                { role: 'selectall' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forcereload' },
                { role: 'toggledevtools' }
            ]
        },
        {
            role: 'window',
            submenu: [
                { role: 'minimize' },
                { role: 'close' }
            ]
        },
        {
            role: 'help',
            submenu: [
                {
                    label: 'Github Repository',
                    click: function () {
                        shell.openExternal(constants.GITHUB_REPO_URL);
                    }
                }
            ]
        }
    ]

    if (process.platform === 'darwin') {
        template.unshift({
            label: 'Heartbeat',
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services', submenu: [] },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideothers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        });
        template[1].submenu.push(
            {
                type: 'separator'
            }, 
            {
                label: 'Speech',
                submenu: [
                    { role: 'startspeaking' },
                    { role: 'stopspeaking' }
                ]
            }
        );
        template[3].submenu = [
            { role: 'close' },
            { role: 'minimize' },
            { role: 'zoom' },
            { type: 'separator' },
            { role: 'front' }
        ];
    } else {
        template.unshift({
            label: 'File',
            submenu: [{
                role: 'quit'
            }]
        });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
});

// check update
app.on('ready', function() {
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
            if (dialog.showMessageBox(options) === 0) {
                shell.openExternal(constants.GITHUB_DOWNLOAD_URL);
            }
        }
    });
});

app.on('activate', function() {
    if (process.platform == 'darwin') {
        main_window.show();
    }
});

app.on('window-all-closed', function() {
    app.quit();
});
