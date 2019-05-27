const request = require('request-promise-native');
const constants = require('./constants');
const auth = require('./auth');
const {Pin, Comment} = require('./models');


module.exports = class CommentsPage {
    constructor(pin_id, pin_html) {
        this.pin_id = pin_id;
        this.pin_html = pin_html;
        this.url = `${constants.PIN_URL}/${pin_id}/root_comments?limit=20&reverse_order=0`;
        this.offset = 0; // needed when fetching older comments
    }

    async start() {
        $('.pin').append(this.pin_html);
        $('.pin').attr('data-id', this.pin_id);
        Pin.update_statistics(this.pin_id);
        this._display_pin_time();

        // add spaces between CJK and half-width characters
        pangu.spacingElementByClassName('text');

        await this._fetch_initial_comments();
        this._enable_scroll_event();

        require('./pin_common');
    }

    _display_pin_time() {
        let time_field = $('.pin .time');
        let post_time = parseInt(time_field.attr('data-time'));
        let date = new Date(post_time * 1000);
        let minutes = date.getMinutes();
        if (minutes < 10)
            minutes = "0" + minutes;
        time_field.text(`${date.getMonth() + 1} 月 ${date.getDate()} 日
                         ${date.getHours()}:${minutes}`);
    }

    async _fetch_initial_comments() {
        let res = await request({
            method: 'GET',
            url: this.url,
            headers: auth.get_authorized_request_header(),
            jar: true,
            json: true
        });
        this._append_to_list(res['data']);
    }

    _enable_scroll_event() {
        let self = this;
        let container = $('.comments-container');
        container.scroll(async function() {
            let page_length = container[0].scrollHeight;
            let scroll_position = container.scrollTop();

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
        let res = await request({
            method: 'GET',
            url: this.url + '&offset=' + this.offset,
            headers: auth.get_authorized_request_header(),
            jar: true,
            simple: false,
            json: true
        });
        try {
            this._append_to_list(res['data']);   
        }
        catch (err) {
            console.warn(res);
        }
    }

    _append_to_list(data) {
        let output = '';
        for (const item of data) {
            let comment = new Comment(item);
            output += comment.get_html();

            let child_items = item['child_comments'];
            if (child_items) {
                output += '<div class="child-comments">';
                for (const child_item of child_items) {
                    let comment = new Comment(child_item);
                    output += comment.get_html();
                }
                output += '</div>'; // child-comments
            }
        }
        $('.comments').append(output);
        // add spaces between CJK and half-width characters
        pangu.spacingElementByClassName('content');

        this.offset += 20;
    }
}
