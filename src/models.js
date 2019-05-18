const request = require('request-promise-native');
const auth = require('./auth');
const constants = require('./constants');


class PinAuthor {
    constructor(author_dict) {
        this.id = author_dict['id'];
        this.name = author_dict['name'];
        this.avatar = author_dict['avatar_url'].replace('_s', '_l');
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
        return (this.id === localStorage.getItem('self_user_id'));
    }
}

class Pin {
    constructor(pin_data) {
        let target = pin_data['target'] ? pin_data['target'] : pin_data;

        this.id = target['id'];
        this.author = new PinAuthor(target['author']);
        this.time = target['updated']; // int
        this.num_likes = target['reaction_count'];
        this.is_liked = target['virtuals']['reaction_type'] === 'like';
        this.num_repins = target['repin_count'];
        this.num_comments = target['comment_count'];
        this.text = '';
        this.images = [];
        this.video = '';

        this.is_repin = 'origin_pin' in target;
        if (this.is_repin) {
            if (target['origin_pin']['is_deleted'])
                this.origin_pin_deleted_reason = target['origin_pin']['deleted_reason'];
            else
                this.origin_pin = new Pin(target['origin_pin']);
        }

        let contents = target['content'];

        // handle text & text repin
        if (
            contents[0]['type'] === 'text' ||
            pin_data['feed_type'] === 'repin' ||
            pin_data['feed_type'] === 'repin_with_comment'
        ) {
            this.text = contents[0]['content']
                .replace(/<script/ig, '')
                .replace(/data-repin=["'][^"']*["']/g, 'class="repin_user"') // mark repin
                .replace(/\sdata-[^=]+=["'][^"']*["']/g, '')
                .replace(/<\/a>:\s?/g, '</a>：') // use full-width colon
                .replace(/\s+class=["']member_mention["']/g, '')
                .replace('<br><a href="zhihu://pin/feedaction/fold/">收起</a>', '');

            const repin_sign = '<i class="fas fa-retweet"></i>';
            const img_sign = '<i class="fas fa-image"></i>';

            let links = this.text.match(
                /<a\s+(class=["'][^"']*["']\s+)?href=["'][^"']*["'](\s+class=["'][^"']*["'])?>/g);
            if (links)
                for (const l of links) {
                    // add repin sign before account names
                    if (l.includes('repin_user'))
                        this.text = this.text.replace(l, repin_sign + l);

                    // add image sign before image links
                    if (l.includes('comment_img') || l.includes('comment_sticker'))
                        this.text = this.text.replace(l, img_sign + l);
                }
        }

        // handle media
        for (const content of contents) {
            if (content['type'] === 'link')
                this.text +=
                    `<div class="link-title">${content['title']}</div>
                     <a class="link" href="${content['url']}">${content['url']}</a>`;

            if (content['type'] === 'image')
                this.images.push(content['url']);

            if (content['type'] === 'video') {
                this.video_thumbnail = content['thumbnail'];
                let video = content['playlist'].find(el => el['quality'] === 'hd');
                this.video = video['url'];
                this.video_height = video['height'];
                this.video_width = video['width'];
            }
        }
    }

    get_statistics_html() {
        let output = '<div class="statistics">';
        if (this.author.is_self()) {
            // include delete button
            output += '<span class="delete-btn"><i class="fas fa-trash-alt"></i></span>';
        }
        output += `<span class="num-comments">
                   <i class="far fa-comment"></i>${this.num_comments}</span>`;
        output += `<span class="num-repins">
                   <i class="fas fa-retweet"></i>${this.num_repins}</span>`;
        // show solid heart if the pin is liked by the user; otherwise show regular heart
        output += `<span class="num-likes">
                   <i class="${this.is_liked ? 'fas' : 'far'} fa-heart"></i>${this.num_likes}
                   </span>`;
        output += '</div>'; // statistics
        return output;
    }
    _get_text_html() {
        return this.text ? `<div class="text">${this.text}</div>` : '';
    }
    _get_image_html() {
        let num_images = this.images.length;
        if (num_images === 0)
            return '';

        let output = '<div class="images">';

        if (num_images === 1)
            output += `<img class="img single-img" src="${this.images[0]}" data-index="0">`;
        else if (num_images === 2)
            for (const [index, url] of this.images.entries())
                output += `<div class="img double-img" data-url="${url}" data-index="${index}"
                            style="background-image: url('${url}');"></div>`;
        else {
            output += '<div class="img-grid"><div class="row">';
            for (const [index, url] of this.images.entries()) {
                output += `<div class="img" data-url="${url}" data-index="${index}"
                            style="background-image: url('${url}');"></div>`;
                // change to new row after every 3 images
                if (index > 1 && (index + 1) % 3 === 0)
                    output += '</div><div class="row">';
            }
            // remove the last <div class="row"> opening tag
            if (output.endsWith('<div class="row">'))
                output = output.slice(0, -17);
            else
                output += '</div>'; // row
            output += '</div>'; // img-grid
        }

        output += '</div>'; // images
        return output;
    }
    _get_video_html() {
        if (this.video === '')
            return '';
        return `<div class="video" data-url="${this.video}" 
                data-width="${this.video_width}" data-height="${this.video_height}">
                <img class="thumbnail" 
                src="${this.video_thumbnail ? this.video_thumbnail : constants.BLANK_THUMBNAIL}">
                <div class="far fa-play-circle"></div>
                </div>`;
    }
    get_content_html() {
        let output = '';
        output += this._get_text_html();
        output += this._get_image_html();
        output += this._get_video_html();
        return output;
    }
    get_html() {
        let output = `
            <div class="author">
                ${this.author.get_avatar_html()}
                ${this.author.get_name_html()}
            </div>
            <div class="time" data-time="${this.time}"></div>
            ${this.get_statistics_html()}
        
            <div class="content">${this.get_content_html()}
        `;

        // if this pin is a repin
        if (this.is_repin) {
            if (this.origin_pin_deleted_reason)
                output += `<div class="origin-pin">${this.origin_pin_deleted_reason}</div>`;

            else {
                output += `
                    <div class="origin-pin" data-id="${this.origin_pin.id}">
                        <div class="author">${this.origin_pin.author.get_name_html()}</div>
                        <div class="origin-pin-content">${this.origin_pin.get_content_html()}</div>
                    </div>
                `;
            }
        }

        output += '</div>'; // content
        return output;
    }

    static async delete(pin_id) {
        let res = await request({
            method: 'DELETE',
            url: constants.PIN_URL + '/' + pin_id,
            headers: auth.get_authorized_request_header(),
            jar: true,
            simple: false,
            json: true
        });
        if (res['success'])
            $(`[data-id="${pin_id}"]`).remove();
    }

    static async like(pin_id) {
        let res = await request({
            method: 'POST',
            url: `${constants.PIN_URL}/${pin_id}/reactions?type=like`,
            headers: auth.get_authorized_request_header(),
            jar: true,
            simple: false,
            json: true
        });
        if (res['success'])
            await Pin.update_statistics(pin_id);
    }

    static async unlike(pin_id) {
        let res = await request({
            method: 'DELETE',
            url: `${constants.PIN_URL}/${pin_id}/reactions`,
            headers: auth.get_authorized_request_header(),
            jar: true,
            simple: false,
            json: true
        });
        if (res['success'])
            await Pin.update_statistics(pin_id);
    }

    static async update_statistics(pin_id) {
        let res = await request({
            method: 'GET',
            url: constants.PIN_URL + '/' + pin_id,
            headers: auth.get_authorized_request_header(),
            jar: true,
            simple: false,
            json: true
        });
        let pin;
        try {
            pin = new Pin(res);
        }
        catch (err) {
            console.warn(res);
            return;
        }
        let selector = `.pin[data-id="${pin_id}"] > .statistics`;
        $(selector).replaceWith(pin.get_statistics_html());
    }

    static async get_html(pin_id) {
        let res = await request({
            method: 'GET',
            url: constants.PIN_URL + '/' + pin_id,
            headers: auth.get_authorized_request_header(),
            jar: true,
            simple: false,
            json: true
        });
        let pin;
        try {
            pin = new Pin(res);
        }
        catch (err) {
            console.warn(res);
            return;
        }
        return pin.get_html();
    }
}

class CommentAuthor {
    constructor(author_dict) {
        this.name = author_dict['member']['name'];
        this.avatar = author_dict['member']['avatar_url'].replace('_s', '_l');
        this.url = author_dict['member']['url'].replace('api.', '');
    }

    get_name_html() {
        return `<a class="name" href="${this.url}">${this.name}</a>`;
    }
    get_html() {
        return `<a href="${this.url}"><img class="avatar" src="${this.avatar}"></a>
                ${this.get_name_html()}`;
    }
}

class Comment {
    constructor(comment_item) {
        this.id = comment_item['id'];
        this.time = comment_item['created_time'];
        this.content = comment_item['content']
            .replace(/\sdata-[^=]+=["'][^"']*["']/g, '');
        this.num_likes = comment_item['vote_count'];
        this.is_liked = comment_item['voting'];
        this.author = new CommentAuthor(comment_item['author']);
        if (comment_item['reply_to_author'])
            this.reply_to_author = new CommentAuthor(comment_item['reply_to_author']);

        // add image sign before image links
        const img_sign = ' <i class="fas fa-image"></i>';
        let links = this.content.match(
            /<a\s+(class=["'][^"']*["']\s+)?href=["'][^"']*["'](\s+class=["'][^"']*["'])?>/g);
        if (links)
            for (const l of links) {
                if (l.includes('comment_img') || l.includes('comment_sticker'))
                    this.content = this.content.replace(l, img_sign + l);
            }
    }

    get_html() {
        let output = '';
        output += `<div class="comment-item" data-id="${this.id}">
                   <div class="author">
                   <span class="comment-author">${this.author.get_html()}</span>`;
        if (this.reply_to_author) {
            output += `<i class="fas fa-long-arrow-alt-right arraw"></i>
                       <span class="comment-author">${this.reply_to_author.get_name_html()}</span>`;
        }
        output += '</div>'; // author
        // show solid heart if the comment is liked by the user; otherwise show regular heart
        output += `<div class="statistics"><span class="num-likes">
                   <i class="${this.is_liked ? 'fas' : 'far'} fa-heart"></i>${this.num_likes}
                   </span></div>`;
        output += `<div class="content">${this.content}</div>`;
        output += '</div>'; // comment-item
        return output;
    }

    static async like(comment_id) {
        let res = await request({
            method: 'POST',
            url: `${constants.COMMENT_URL}/${comment_id}/voters`,
            headers: auth.get_authorized_request_header(),
            jar: true,
            simple: false,
            json: true
        });
        if (res['voting']) {
            // show solid heart
            let selector = `.comment-item[data-id="${comment_id}"] > .statistics > .num-likes`;
            $(selector).html(`<i class="fas fa-heart"></i>${res['vote_count']}`);
        }
    }

    static async unlike(comment_id) {
        let self_id = localStorage.getItem('self_user_id');
        let res = await request({
            method: 'DELETE',
            url: `${constants.COMMENT_URL}/${comment_id}/voters/${self_id}`,
            headers: auth.get_authorized_request_header(),
            jar: true,
            simple: false,
            json: true
        });
        if (!res['voting']) {
            // show regular heart
            let selector = `.comment-item[data-id="${comment_id}"] > .statistics > .num-likes`;
            $(selector).html(`<i class="far fa-heart"></i>${res['vote_count']}`);
        }
    }
}


module.exports = {Pin, Comment};
