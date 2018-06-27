const {app, BrowserWindow} = require('electron');
try {
    require('electron-reloader')(module);
} catch (err) {}


let main_window = null;

function create_window () {
    main_window = new BrowserWindow({
        width: 450,
        minWidth: 450,
        maxWidth: 560,
        height: 800,
        titleBarStyle: 'hiddenInset',
        backgroundColor: "#484848",
        webPreferences: { scrollBounce: true }
    });

    main_window.loadFile('index.html');

    // Open the DevTools.
    main_window.webContents.openDevTools();

    main_window.on('closed', function () {
        main_window = null;
    });
}

app.on('ready', create_window);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow()
  }
})
