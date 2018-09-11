const constants = require('./constants');


class PinAuthor {
    constructor(author_dict) {
        this.id = author_dict['id'];
        this.name = author_dict['name'];
        this.avatar = author_dict['avatar_url'];
        this.url = constants.BASE_WEB_URL + author_dict['url'];
    }

    get_avatar_html() {
        return '<a href="' + this.url +'">' + 
               '<img class="avatar" src="' + this.avatar + '"></a>';
    }
    get_name_html() {
        return '<a class="name" href="' + this.url +'">' + this.name + '</a>';
    }
    is_self() {
        return (this.id == localStorage.getItem('self_user_id'));
    }
}

class Pin {
    constructor(feed_item) {
        var target = feed_item['target'] ? feed_item['target'] : feed_item;
        this.source_dict = target;

        this.id = target['id'];
        this.author = new PinAuthor(target['author']);
        this.time = target['updated']; // int
        this.likes = target['reaction_count'];
        this.repins = target['repin_count'];
        this.comments_count = target['comment_count'];
        this.text = '';
        this.images = [];
        this.video = ''; // video url

        var content_array = target['content'];

        // handle text & text repin
        if (
            content_array[0]['type'] == 'text' ||
            feed_item['feed_type'] == 'repin' || 
            feed_item['feed_type'] == 'repin_with_comment'
        ) {
            this.text = content_array[0]['content']
                .replace(/<script/ig, '')
                .replace(/data-repin=["'][^"']*["']/g, 'class="repin_account"') // mark repin
                .replace(/\sdata-\w+=["'][^"']*["']/g, '') // remove data-* attributes
                .replace(/<\/a>:\s?/g, '</a>：') // use full-width colon
                .replace(/\sclass=["']member_mention["']/g, '')
                .replace('<br><a href="zhihu://pin/feedaction/fold/">收起</a>', '');

            // add repin sign before account names
            const repin_sign = '<i class="fas fa-retweet"></i>';

            /*
                an account name without data-* attributes looks like this:
                <a href="..." class="repin_account">name</a>

                2 possibilities: class comes first or href comes first 
            */

            // case 1: class first
            this.text = this.text.replace(/<a\sclass="repin_account"/g, repin_sign + '<a');

            // case 2: href first
            var urls = this.text.match(/<a\shref=["'][^"']*["']\sclass="repin_account"/g);
            if (urls) {
                for (var i = 0; i < urls.length; i++) {
                    this.text = this.text.replace(urls[i], repin_sign + urls[i]);
                }
            }   
        }

        // handle media
        for (var i = 0; i < content_array.length; i++) {
            if (content_array[i]['type'] == 'link') {
                var url = content_array[i]['url'];
                url = '<a class="link" href="' + url + '">' + url + '</a>';
                var title = content_array[i]['title'];
                this.text += '<div class="link-title">' + title + '</div>' + url;
            }
            if (content_array[i]['type'] == 'image') {
                this.images.push(content_array[i]['url']);
            }
            else if (content_array[i]['type'] == 'video') {
                this.video_thumbnail = content_array[i]['thumbnail'];
                var playlist = content_array[i]['playlist'];
                for (var j = 0; j < playlist.length; j++) {
                    if (playlist[j]['quality'] == 'hd') {
                        this.video = playlist[j]['url'];
                        this.video_height = playlist[j]['height'];
                        this.video_width = playlist[j]['width'];
                        break;
                    }
                }
            }
        }
    }

    get_statistics_html() {
        var output = '<div class="statistics">';
        if (this.author.is_self()) {
            // include delete button
            output += '<span class="delete-btn"><i class="fas fa-trash-alt"></i></span>';
        }
        output += '<span><i class="far fa-comment"></i>' + this.comments_count + '</span>';
        output += '<span><i class="fas fa-retweet"></i>' + this.repins + '</span>';
        output += '<span><i class="far fa-heart"></i>' + this.likes + '</span>';
        output += '</div>'; // statistics
        return output;
    }
    get_content_html() {
        var output = '';

        if (this.text) {
            output += '<div class="text">' + this.text + '</div>';
        }

        var image_count = this.images.length;
        if (image_count) {
            output += '<div class="images">';
            if (image_count == 1) {
                // <img class="img single-img" src="...">
                output += '<img class="img single-img" src="' + this.images[0] + '">';
            }
            else if (image_count == 2) {
                for (var i = 0; i < 2; i++) {
                    // <div class="img double-img" style="background-image: url('...');"></div>
                    output += '<div class="img double-img" style="background-image: url(\''
                              + this.images[i] + '\');"></div>';
                }
            }
            else {
                output += '<div class="img-grid"><div class="row">';
                for (var i = 0; i < image_count; i++) {
                    output += '<div class="img" style="background-image: url(\''
                              + this.images[i] + '\');"></div>';
                    // change to new row after every 3 images
                    if (i > 1 && (i + 1) % 3 == 0) {
                        output += '</div><div class="row">';
                    }
                }
                // remove the last <div class="row"> opening tag
                if (output.slice(-17) == '<div class="row">') {
                    output = output.slice(0, -17);
                }
                else {
                    output += '</div>'; // row
                }
                output += '</div>'; // img-grid
            }
            output += '</div>'; // images
        }

        if (this.video) {
            output += '<div class="video" data-url="' + this.video + '" ' + 
                      'data-width="' + this.video_width + '" ' + 
                      'data-height="' + this.video_height + '">';
            output += '<img class="thumbnail" src="' + this.video_thumbnail + '">';
            output += '<div class="far fa-play-circle"></div>';
            output += '</div>';
        }

        return output;
    }
    get_html() {
        var output = '<div class="author">' + this.author.get_avatar_html() + 
                  this.author.get_name_html() + '</div>';
        output += '<div class="time" data-time="' + this.time + '"></div>';
        output += this.get_statistics_html();

        output += '<div class="content">' + this.get_content_html();

        // if this pin is a repin
        if (this.source_dict['origin_pin']) {
            if (this.source_dict['origin_pin']['is_deleted']) {
                output += '<div class="origin-pin">';
                output += this.source_dict['origin_pin']['deleted_reason'];
            }
            else {
                var origin_pin = new Pin(this.source_dict['origin_pin']);
                output += '<div class="origin-pin" data-id="' + origin_pin.id + '">';
                output += '<div class="author">' + origin_pin.author.get_name_html() + '</div>';
                output += '<div class="origin-pin-content">' + 
                          origin_pin.get_content_html() + '</div>';
            }
            output += '</div>'; // origin-pin
        }

        output += '</div>'; // content
        return output;
    }
}

class CommentAuthor {
    constructor(author_dict) {
        this.name = author_dict['member']['name'];
        this.avatar = author_dict['member']['avatar_url'];
        this.url = author_dict['member']['url'].replace('api.', '');
    }

    get_name_html() {
        return '<a class="name" href="' + this.url +'">' + this.name + '</a>';
    }
    get_html() {
        var output = '';
        output += '<a href="' + this.url +'">' +
                  '<img class="avatar" src="' + this.avatar + '"></a>';
        output += this.get_name_html();
        return output;
    }
}

class Comment {
    constructor(comment_item) {
        this.id = comment_item['id'];
        this.time = comment_item['created_time'];
        this.content = comment_item['content'];
        this.likes = comment_item['vote_count'];
        this.author = new CommentAuthor(comment_item['author']);
        if (comment_item['reply_to_author']) {
            this.reply_to_author = new CommentAuthor(comment_item['reply_to_author']);
        }
    }

    get_html() {
        var output = '';
        output += '<div class="comment-item">';
        output += '<div class="author">';
        output += '<span class="comment-author">'
        output += this.author.get_html();
        output += '</span>'; // comment-author
        if (this.reply_to_author) {
            output += '<i class="fas fa-long-arrow-alt-right arraw"></i>'
            output += '<span class="comment-author">'
            output += this.reply_to_author.get_name_html();
            output += '</span>'; // comment-author
        }
        output += '</div>'; // author
        output += '<div class="statistics">' +
                  '<span><i class="far fa-heart"></i>' + this.likes + '</span>' +
                  '</div>';
        output += '<div class="content">';
        output += this.content;
        output += '</div>'; // content
        output += '</div>'; // comment-item
        return output;
    }
}


module.exports = {Pin, Comment}
