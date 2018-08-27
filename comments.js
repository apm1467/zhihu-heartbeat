const request = require('request');
const remote = require('electron').remote;
const {BrowserWindow} = remote;
const constants = require('./constants');
const auth = require('./auth');
const {Pin} = require('./feed');


class Author {
    constructor(author_item) {
        this.name = author_item['member']['name'];
        this.avatar = author_item['member']['avatar_url'];
        this.url = author_item['member']['url'].replace('api.', '');
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
        this.author = new Author(comment_item['author']);
        if (comment_item['reply_to_author']) {
            this.reply_to_author = new Author(comment_item['reply_to_author']);
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


module.exports = class Comments {
    constructor(pin_id) {
        this.pin_id = pin_id;
        this.url = constants.PIN_URL + '/' + pin_id + 
                   '/root_comments?limit=20&reverse_order=0';
        this.offset = 0; // needed when fetching older comments
    }

    start() {
        this._fetch_pin();
        this._fetch_initial_comments();
    }

    _fetch_pin() {
        var options = {
            method: 'GET',
            url: constants.PIN_URL + '/' + this.pin_id,
            headers: auth.get_authorized_request_header(),
            jar: true
        };
        request(options, function(error, response, body) {
            var parsed = JSON.parse(body);

            if (parsed['error']) {
                $('.pin').append(parsed['error']['message']);
                return;
            }

            var pin = new Pin(parsed);
            $('.pin').append(pin.get_html());
        });
    }

    _fetch_initial_comments() {
        var options = {
            method: 'GET',
            url: this.url,
            headers: auth.get_authorized_request_header(),
            jar: true
        };
        var self = this;
        request(options, function(error, response, body) {
            var data_array = JSON.parse(body)['data'];
            self._append_to_list(data_array);

            // enable comments scroll event
            self._enable_comments_scroll_event()
        });
    }

    _enable_comments_scroll_event() {
        var self = this;
        var container = $('.comments-container');
        container.scroll(function () {
            var page_length = container[0].scrollHeight;
            var scroll_position = container.scrollTop();

            // scroll down to fetch older comments
            if (page_length - scroll_position < 2000) {
                self._fetch_older_comments();

                // unbind scroll event
                container.off('scroll');
            }
        });
    }

    _fetch_older_comments() {
        var options = {
            method: 'GET',
            url: this.url + '&offset=' + this.offset,
            headers: auth.get_authorized_request_header(),
            jar: true
        };
        var self = this;
        request(options, function(error, response, body) {
            try {
                var data_array = JSON.parse(body)['data'];
                self._append_to_list(data_array);   
            }
            catch (err) {
                console.warn(body);
            }

            // re-enable comments scroll event
            self._enable_comments_scroll_event();
        });
    }

    _append_to_list(data_array) {
        var output = '';
        for (var i = 0; i < data_array.length; i++) {
            var comment = new Comment(data_array[i]);
            output += comment.get_html();

            var child_comments = data_array[i]['child_comments'];
            if (child_comments) {
                output += '<div class="child-comments">';
                for (var j = 0; j < child_comments.length; j++) {
                    var comment = new Comment(child_comments[j]);
                    output += comment.get_html();
                }
                output += '</div>'; // child-comments
            }
        }
        $('.comments').append(output);
        this.offset += 20;
    }
}
