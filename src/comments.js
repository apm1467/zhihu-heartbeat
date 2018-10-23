const request = require('request-promise');
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

    async start() {
        $('.pin').append(this.pin_html);
        await this._fetch_initial_comments();
        this._enable_scroll_event();
    }

    async _fetch_initial_comments() {
        var res = await request({
            method: 'GET',
            url: this.url,
            headers: auth.get_authorized_request_header(),
            jar: true,
            json: true
        });
        this._append_to_list(res['data']);
    }

    _enable_scroll_event() {
        var self = this;
        var container = $('.comments-container');
        container.scroll(async function() {
            var page_length = container[0].scrollHeight;
            var scroll_position = container.scrollTop();

            // scroll down to fetch older comments
            if (page_length - scroll_position < 2000) {
                // only send one fetch request
                container.off('scroll');
                await self._fetch_older_comments();
                self._enable_scroll_event();
            }
        });
    }

    async _fetch_older_comments() {
        var res = await request({
            method: 'GET',
            url: this.url + '&offset=' + this.offset,
            headers: auth.get_authorized_request_header(),
            jar: true,
            simple: false,
            json: true
        });
        try {
            var data = res['data'];
            self._append_to_list(data);   
        }
        catch (err) {
            console.warn(res);
        }
    }

    _append_to_list(data) {
        var output = '';
        for (const item of data) {
            var comment = new Comment(item);
            output += comment.get_html();

            var child_items = item['child_comments'];
            if (child_items) {
                output += '<div class="child-comments">';
                for (const child_item of child_items) {
                    var comment = new Comment(child_item);
                    output += comment.get_html();
                }
                output += '</div>'; // child-comments
            }
        }
        $('.comments').append(output);
        this.offset += 20;
    }
}
