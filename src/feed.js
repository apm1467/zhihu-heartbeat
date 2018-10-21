const request = require('request-promise');
const constants = require('./constants');
const auth = require('./auth');
const {Pin} = require('./models');


module.exports = class Feed {
    constructor() {
        this.feed_offset = 0; // needed when fetching older feed
        this.local_latest_pin_id = '';
        this.server_latest_pin_id = '';
        this.local_latest_pin_time = 0;
        this.server_latest_pin_time = 0;
        this.local_oldest_pin_id = '';
    }

    async start() {
        display_self_avatar();
        await this._fetch_initial_feed();
        this._enable_scroll_event();
        setInterval(
            () => this._check_update(), 
            constants.FEED_UPDATE_INTERVAL
        );
    }

    async _fetch_initial_feed() {
        var options = {
            method: 'GET',
            url: constants.PIN_FETCH_URL + '?reverse_order=0',
            headers: auth.get_authorized_request_header(),
            jar: true,
            json: true
        };
        var res = await request(options);
        if (res['data'] === undefined) {
            console.warn(res);
            return;
        }
        var feed_array = res['data'];

        // get latest pin id & time
        for (const feed_item of feed_array) {
            if (feed_item['type'] == 'moment') {
                var pin = new Pin(feed_item);
                this.local_latest_pin_id = pin.id;
                this.local_latest_pin_time = pin.time;
                break;
            }
        }

        this._report_latest_viewed_pin_id();
        this._append_to_feed(feed_array);
    }

    _enable_scroll_event() {
        var container = $('.feed-container');
        var self = this;
        container.scroll(async function() {
            var page_length = container[0].scrollHeight;
            var scroll_position = container.scrollTop();

            // scroll down to fetch older feed
            if (page_length - scroll_position < 3000) {
                // only send one fetch request
                container.off('scroll');
                await self._fetch_older_feed();
                self._enable_scroll_event();
            }

            // remove update notification when scroll to top
            else if (scroll_position <= 5)
                $('#update-notification').removeClass('notification-show');
        });
    }

    async _fetch_older_feed() {
        var options = {
            method: 'GET',
            url: constants.PIN_FETCH_URL + '?after_id=' + this.local_oldest_pin_id + 
                 '&offset=' + this.feed_offset,
            headers: auth.get_authorized_request_header(),
            jar: true,
            json: true
        };
        var res = await request(options);

        if (res['data'])
            this._append_to_feed(res['data']);
        else
            console.warn(res);
    }

    async _check_update() {
        var options = {
            method: 'GET',
            url: constants.PIN_FETCH_URL + '?reverse_order=0',
            headers: auth.get_authorized_request_header(),
            jar: true,
            json: true
        };
        var res = await request(options);
        if (res['data'] === undefined) {
            console.warn(res);
            return;
        }
        var feed_array = res['data'];

        for (const feed_item of feed_array) {
            if (feed_item['type'] == 'moment') {
                var pin = new Pin(feed_item);
                console.log(pin.id);

                if (
                    pin.id != this.local_latest_pin_id &&
                    pin.time + 10 > this.local_latest_pin_time // 10 sec tolerance
                ) {
                    this.server_latest_pin_id = pin.id;
                    this.server_latest_pin_time = pin.time;

                    // get the first pin, and fetch the rest in _fetch_update()
                    var output = generate_feed_item_html(feed_item);
                    this._fetch_update(pin.id, 0, output);
                }
                break;
            }
        }
    }

    async _fetch_update(fetch_after_id, fetch_offset, output) {
        console.log(fetch_offset);
        var options = {
            method: 'GET',
            url: constants.PIN_FETCH_URL + 
                 '?after_id=' + fetch_after_id + '&offset=' + fetch_offset,
            headers: auth.get_authorized_request_header(),
            jar: true,
            json: true
        };
        var res = await request(options);
        var feed_array = res['data'];
        var stop_fetching = false;

        for (const feed_item of feed_array) {
            if (feed_item['type'] == 'moment') {
                var pin = new Pin(feed_item);
                if (
                    pin.id == this.local_latest_pin_id ||
                    pin.time + 10 <= this.local_latest_pin_time
                ) {
                    stop_fetching = true;
                    break;
                }
                else {
                    fetch_after_id = pin.id;
                    output += generate_feed_item_html(feed_item);
                }
            }
        }
        if (stop_fetching) {
            this.local_latest_pin_id = this.server_latest_pin_id;
            this.local_latest_pin_time = this.server_latest_pin_time;
            this._report_latest_viewed_pin_id();

            output = '<div id="update" class="hidden">' + output + '</div>';
            $('.feed').prepend(output);

            // give update 2 seconds to load
            setTimeout( 
                () => {
                    var update = $('#update');
                    var container = $('.feed-container');
                    var scroll_top = container.scrollTop();
    
                    update.removeClass('hidden');
                    // maintain scroll bar position
                    container.scrollTop(scroll_top + update.outerHeight(true));
    
                    // remove outer .update div
                    update.children().unwrap();
    
                    // display feed update notification
                    $('#update-notification').addClass('notification-show');
                }, 
                2000
            );
        }
        else
            // make recursive call to fetch more update
            this._fetch_update(fetch_after_id, fetch_offset + 10, output);
    }

    _report_latest_viewed_pin_id() {
        var options = {
            method: 'POST',
            url: constants.PIN_VIEWS_REPORT_URL,
            headers: auth.get_authorized_request_header(),
            form: { 'pin_ids': this.local_latest_pin_id },
            jar: true
        };
        request(options);
    }

    _append_to_feed(items) {
        var output = '';
        for (const item of items)
            output += generate_feed_item_html(item);
        $('.feed').append(output);

        this.local_oldest_pin_id = items[items.length - 1]['target']['id'];
        this.feed_offset += 10;
    }

    static async delete_pin(id) {
        var options = {
            method: 'DELETE',
            url: constants.PIN_URL + '/' + id,
            headers: auth.get_authorized_request_header(),
            jar: true,
            json: true
        };
        var res = await request(options);
        if (res['success']) {
            var selector = '[data-id="' + id + '"]';
            $(selector).remove();
        }
    }

    static async update_pin_statistics(id) {
        var options = {
            method: 'GET',
            url: constants.PIN_URL + '/' + id,
            headers: auth.get_authorized_request_header(),
            jar: true,
            json: true
        };
        var res = await request(options);
        try {
            var pin = new Pin(res);
        }
        catch (err) {
            console.warn(res);
            return;
        }

        var selector = '.feed-item[data-id="' + id + '"] > .statistics';
        $(selector).replaceWith(pin.get_statistics_html());
    }
}


async function display_self_avatar() {
    var options = {
        method: 'GET',
        url: constants.SELF_URL,
        headers: auth.get_authorized_request_header(),
        json: true,
        jar: true
    };
    var res = await request(options);
    
    if ("error" in res) {
        display_self_avatar();
        return;
    }

    var avatar = res['avatar_url'].replace('_s', ''); // get large image
    $('.title-bar').append('<img class="self-avatar" src="' + avatar + '">');
}

function generate_feed_item_html(feed_item) {
    var output = '';
    if (feed_item['type'] == 'moment') {
        var pin = new Pin(feed_item);
        output += '<div class="feed-item" data-id="' + pin.id + '">';
        output += pin.get_html();
        output += '</div>'; // feed-item
    }
    return output;
}
