const request = require('request');
const constants = require('./constants');
const auth = require('./auth');
const {Comment} = require('./models');


module.exports = class Comments {
    constructor(pin_id, pin_html) {
        this.pin_id = pin_id;
        this.pin_html = pin_html;
        this.url = constants.PIN_URL + '/' + pin_id + 
                   '/root_comments?limit=20&reverse_order=0';
        this.offset = 0; // needed when fetching older comments
    }

    start() {
        $('.pin').append(this.pin_html);
        this._fetch_initial_comments();
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
