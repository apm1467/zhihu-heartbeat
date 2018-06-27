const {app, BrowserWindow} = require('electron');
try {
  require('electron-reloader')(module);
} catch (err) {}


let mainWindow = null

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 450,
    minWidth: 450,
    maxWidth: 560,
    height: 800,
    titleBarStyle: 'hidden',
    backgroundColor: "#484848",
  })

  mainWindow.loadFile('index.html')

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  mainWindow.on('closed', function () {
    mainWindow = null
  })
}

app.on('ready', createWindow)

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
