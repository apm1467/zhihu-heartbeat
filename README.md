# Zhihu Heartbeat

（非官方）知乎想法桌面端，兼容 macOS 与 Windows，用以替代知乎想法网页版。点击[这里](https://github.com/apm1467/zhihu-heartbeat/releases/latest)下载。

## 功能

本软件可以：

- 提供流畅的阅读体验
- 自动获取时间线更新
- 发布或删除新想法
- 打开高清图片和视频
- 查看评论
- 表达作者对桌面操作系统的[喜爱](https://overcast.fm/+CdRRhGxw/1:30:56)

## macOS

第一次运行可能需要在「系统偏好设置」→「安全性与隐私」中点击允许。

<img width="800" alt="screenshot" src="https://user-images.githubusercontent.com/10210967/48238118-10d39200-e3ca-11e8-952f-5343979a7dde.png">

<img width="800" alt="screenshot" src="https://user-images.githubusercontent.com/10210967/48238119-10d39200-e3ca-11e8-9c52-a8b0cef974c7.png">


## Windows

<img width="450" alt="screenshot" src="https://user-images.githubusercontent.com/10210967/44744790-390b5e80-ab06-11e8-88ac-7be70d3ac4a3.png">

## 键盘快捷键

- `j`/`↓` 去下一条想法
- `k`/`↑` 去上一条想法
- `g` 去时间线顶部（再按一次返回原位置）
- `m` 折叠想法
- `s` 给想法点赞
- `i` 查看想法内的图片或视频
- `space`/`enter` 查看想法评论
- `esc` 退出图片、视频或评论窗口
- `h`/`←` 前一张图片
- `l`/`→` 后一张图片

## 构建方法

本软件使用 [Electron](https://electronjs.org) 框架，在 macOS 与 Windows 系统上均可构建。

1. 安装 [`yarn`](https://yarnpkg.com/lang/en/docs/install/) 
2. `$ cd zhihu-heartbeat/`
3. `$ yarn install`
4. 使用 `$ yarn start` 直接启动程序，或 `$ yarn dist --mac --win` 生成对应两个系统的可执行程序

## 致谢

- OAuth 登录部分参照了开源项目 [Zhihu-OAuth](https://github.com/7sDream/zhihu-oauth) 的[方法](http://zhihu-oauth.readthedocs.io/zh_CN/latest/for-dev/oauth/game.html)
- 本软件图标和界面均使用了 [Font Awesome](https://fontawesome.com) 的免费图标字体
- 视频播放部分使用了 [hls.js](https://github.com/video-dev/hls.js/) 开源库
- 感谢知乎
