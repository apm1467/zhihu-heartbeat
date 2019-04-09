# Zhihu Heartbeat

（非官方）知乎想法 Mac/Windows 客户端，用以在电脑上使用知乎想法。点击[这里](https://github.com/apm1467/zhihu-heartbeat/releases/latest)下载。

## 功能

本软件可以：

- 提供流畅的阅读体验
- 自动获取时间线更新
- 发布或删除想法
- 打开高清图片和视频
- 查看想法评论
- 表达作者对桌面操作系统的[喜爱](https://overcast.fm/+CdRRhGxw/1:30:56)

## macOS

第一次运行可能需要在「系统偏好设置」→「安全性与隐私」中点击允许。

<img width="800" alt="screenshot" src="https://user-images.githubusercontent.com/10210967/55666973-73846900-5856-11e9-9121-b062e28cc1b4.png">


## Windows

<img width="450" alt="screenshot" src="https://user-images.githubusercontent.com/10210967/55829427-eae42200-5b0e-11e9-8030-0a4fd85c9d99.png">

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
- 软件图标和界面均使用了 [Font Awesome](https://fontawesome.com) 的免费图标字体
- 视频播放部分使用了 [hls.js](https://github.com/video-dev/hls.js/) 开源库
- 使用了 [pangu.js](https://github.com/vinta/pangu.js) 在中西文字符之间自动插入空格
- 界面灵感来自 [Tweetbot](https://tapbots.com/tweetbot/mac/) 和 [Reeder 4](https://beta.reeder.ch)
- 感谢知乎
