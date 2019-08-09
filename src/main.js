const fs = require('fs');
const path = require('path');
const {app, BrowserWindow, Menu} = require('electron');
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
        webPreferences: { nodeIntegration: true },
        width: 500,
        minWidth: 400,
        maxWidth: 600,
        height: 800,
        titleBarStyle: 'hiddenInset',
        backgroundColor: "#2C2924",
        autoHideMenuBar: true,
        fullscreenable: false,
        useContentSize: true
    });

    // restore window bounds
    let bounds;
    try {
        bounds = JSON.parse(fs.readFileSync(window_bounds_path, 'utf8'));
    }
    catch (err) {}
    if (bounds)
        main_window.setBounds(bounds);

    main_window.loadFile('src/index.html');

    // hide the main window instead of closing it on macOS
    if (process.platform === 'darwin') {
        // user can still quit the app normally
        let user_quit = false;
        app.on('before-quit', () => user_quit = true);

        main_window.on('close', function(event) {
            if (!user_quit) {
                event.preventDefault();
                main_window.hide();
                return false;
            }
        });

        app.on('activate', () =>  main_window.show());
    }

    // save window bounds
    main_window.on('close', function(event) {
        let bounds = main_window.getBounds();
        fs.writeFileSync(window_bounds_path, JSON.stringify(bounds));
    });
});

// create app menu
app.once('ready', function() {
    let template = [
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
                    click: () => shell.openExternal(constants.GITHUB_REPO_URL)
                }
            ]
        }
    ];

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
            { type: 'separator' },
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
            submenu: [{ role: 'quit' }]
        });
    }

    let menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
});

app.on('window-all-closed', () => app.quit());

// allow video auto play
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
