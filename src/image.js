const fs = require('fs');
const request = require('request');
const electron = require('electron');
const remote = electron.remote;
const {app, dialog, BrowserWindow, Menu} = remote;

const current_window = remote.getCurrentWindow();


exports.open_img_viewer = open_img_viewer;

function open_img_viewer(urls, index_clicked) {
    let img = new Image();
    img.src = urls[index_clicked];
    img.onload = function() {
        let {win_w, win_h} = calculate_img_window_size(this.width, this.height);
        let win = new BrowserWindow({
            webPreferences: { nodeIntegration: true },
            titleBarStyle: 'hidden',
            show: false,
            height: win_h,
            width: win_w,
            backgroundColor: "#000",
            autoHideMenuBar: true,
            fullscreenable: false,
            useContentSize: true
        });
        win.loadFile('src/image_viewer.html');
        win.webContents.on('did-finish-load', () =>
            win.webContents.send('urls', urls, index_clicked)
        );
        win.once('ready-to-show', () => {
            win.show();
            $('.img').removeClass('darkened');
        });
        win.on('closed', () => win = null);
    }
}

// img: jQuery obj
// if img is provided, the context menu will have "open original image" option
exports.open_img_context_menu = function(urls_compressed, index_clicked, img = null) {
    // get uncompressed urls
    let urls = urls_compressed.map((url) => url.replace('_qhd', ''));
    let desktop_path = app.getPath('desktop') + '/';
    let file_name = Date.now() + '.jpg';

    let template = [
        {
            label: '保存原图到桌面',
            click: () =>
                request(urls[index_clicked]).pipe(fs.createWriteStream(desktop_path + file_name))
        },
        {
            label: '保存原图到…',
            click: () => {
                current_window.focus();
                let path = dialog.showSaveDialog({
                    title: '保存原图',
                    defaultPath: file_name,
                    filters: [{ extensions: ['jpg'] }]
                });
                if (path)
                    request(urls[index_clicked]).pipe(fs.createWriteStream(path));
            }
        }
    ];
    if (img)
        template = [
            {
                label: '打开原图',
                click: () => {
                    img.addClass('darkened');
                    open_img_viewer(urls, index_clicked);
                }
            },
            { type: 'separator' },
            ...template
        ];

    let img_menu = Menu.buildFromTemplate(template);
    img_menu.popup({});
}

function calculate_img_window_size(img_w, img_h) {
    let current_screen = remote.screen.getDisplayMatching(current_window.getBounds());
    let screen_w = current_screen.workAreaSize.width;
    let screen_h = current_screen.workAreaSize.height;
    let max_w = Math.ceil(screen_w * 0.95);
    let max_h = Math.ceil(screen_h * 0.9);
    let output_w;
    let output_h;

    if (max_w < img_w || max_h < img_h) {
        let aspect_ratio = img_w / img_h;
        if (aspect_ratio <= 0.45) {
            // image is very tall; allow scroll in vertical direction
            output_w = Math.min(max_w, img_w);
            output_h = Math.ceil(output_w / aspect_ratio);
        }
        else {
            // normal aspect ratio; display entire image on screen
            output_h = Math.min(max_h, img_h);
            output_w = Math.floor(output_h * aspect_ratio);

            if (output_w > screen_w) {
                // image is very wide; adjust window size according to screen width
                output_w = max_w;
                output_h = Math.ceil(output_w / aspect_ratio);
            }
        }
    }
    else {
        output_w = img_w;
        output_h = img_h;
    }
    return {win_w: output_w, win_h: output_h};
}
