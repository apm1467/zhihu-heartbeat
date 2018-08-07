# Zhihu Heartbeat

（非官方）知乎想法桌面端，兼容 macOS 与 Windows，用以替代官方没有发布的知乎想法网页版。点击[这里](https://github.com/apm1467/zhihu-heartbeat/releases/latest)下载。

## 功能

- 阅读体验流畅
- 时间线自动刷新
- 发布或删除新想法
- 用大屏幕打开高清图片和视频

## macOS

第一次运行可能需要在「系统偏好设置」=>「安全性与隐私」 中点击允许。

![](https://user-images.githubusercontent.com/10210967/43783097-2bc4b7c2-9a61-11e8-93fa-f41b1f0d1486.png)

![](https://user-images.githubusercontent.com/10210967/43783098-2be3a6b4-9a61-11e8-999b-c72543723996.png)

![](https://user-images.githubusercontent.com/10210967/43783099-2c053a86-9a61-11e8-89fb-c6c1ac16d24e.png)

## Windows

![](https://user-images.githubusercontent.com/10210967/43783981-540f8584-9a63-11e8-9f5d-27c07ce1f36e.png)

## 构建方法

本软件使用 [Electron](https://electronjs.org) 框架，在 macOS 与 Windows 系统上均可构建。

1. 安装 [`yarn`](https://yarnpkg.com/lang/en/docs/install/) 
2. `$ cd zhihu-heartbeat/`
3. `$ yarn install`
4. 使用 `$ yarn start` 直接启动程序，或 `$ yarn dist --mac --win` 输出对应两个系统的可执行程序

## 致谢

- OAuth 登录部分参照了开源项目 [Zhihu-OAuth](https://github.com/7sDream/zhihu-oauth) 的[方法](http://zhihu-oauth.readthedocs.io/zh_CN/latest/for-dev/oauth/game.html)
- 本软件图标和界面均使用了 [Font Awesome](https://fontawesome.com) 的免费图标字体
- 视频播放部分使用了 [hls.js](https://github.com/video-dev/hls.js/) 开源库
- 感谢知乎，希望不要封我
