const {app, BrowserWindow, Menu} = require('electron');
const shell = require('electron').shell;
try {
    require('electron-reloader')(module);
} catch (err) {}


let main_window = null;

function create_window () {
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

    main_window.loadFile('index.html');

    // only hide the main window when user closes it on macOS
    // not preventing user from quitting the app
    if (process.platform === 'darwin') {
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

    main_window.on('closed', function() {
        main_window = null;
    });
}

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
                        shell.openExternal('https://github.com/apm1467/zhihu-heartbeat');
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

app.on('ready', create_window);

app.on('window-all-closed', function() {
    app.quit();
});

app.on('activate', function() {
    if (process.platform == 'darwin') {
        main_window.show();
    }
});
