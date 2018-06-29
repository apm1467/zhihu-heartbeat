const {app, BrowserWindow} = require('electron');
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
        webPreferences: { scrollBounce: true }
    });

    main_window.loadFile('index.html');

    // Open the DevTools.
    main_window.webContents.openDevTools();

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

    main_window.on('closed', function () {
        main_window = null;
    });
}

app.on('ready', create_window);

app.on('window-all-closed', function () {
    app.quit();
});

app.on('activate', function () {
    if (process.platform == 'darwin') {
        main_window.show();
    }
});
