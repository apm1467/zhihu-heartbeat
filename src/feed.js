const request = require('request');
const constants = require('./constants');
const auth = require('./auth');
const {Pin} = require('./models');


module.exports = class Feed {
    constructor() {
        this.feed_offset = 0; // needed when fetching older feed
        this.latest_local_pin_id = '';
        this.latest_local_pin_time = 0;
        this.oldest_local_pin_id = '';
        this.server_latest_pin = null; // a Pin object
    }

    start() {
        // async callback order:
        // _fetch_initial_feed() => _enable_feed_scroll_event()
        this._fetch_initial_feed();
        display_self_avatar();

        // check feed update every few seconds
        var self = this;
        setInterval(
            function() {
                self._check_update();
            }, 
            constants.FEED_UPDATE_INTERVAL
        );
    }

    _fetch_initial_feed() {
        var options = {
            method: 'GET',
            url: constants.PIN_FETCH_URL + '?reverse_order=0',
            headers: auth.get_authorized_request_header(),
            jar: true
        };
        var self = this;
        request(options, function(error, response, body) {
            var feed_array = JSON.parse(body)['data'];
    
            // get latest pin id & time
            for (var i = 0; i < feed_array.length; i++) {
                var feed_item = feed_array[i];
                if (feed_item['type'] == 'moment') {
                    var pin = new Pin(feed_item);
                    self.latest_local_pin_id = pin.id;
                    self.latest_local_pin_time = pin.time;
                    break;
                }
            }

            self._report_latest_viewed_pin_id();
            self._append_to_feed(feed_array);

            // enable feed scroll event
            self._enable_feed_scroll_event();
        });
    }

    _enable_feed_scroll_event() {
        var self = this;
        var container = $('.feed-container');
        container.scroll(function () {
            var page_length = container[0].scrollHeight;
            var scroll_position = container.scrollTop();

            // Scroll down to fetch older feed.
            if (page_length - scroll_position < 3000) {
                self._fetch_older_feed();
    
                // Unbind scroll event so only one fetch request is sent.
                // The scroll event will be re-enabled in _fetch_older_feed().
                container.off('scroll');
            }

            // Scroll to top to clear feed update notification.
            else if (scroll_position <= 5) {
                $('#update-notification').removeClass('notification-show');
            }
        });
    }

    _fetch_older_feed() {
        var options = {
            method: 'GET',
            url: constants.PIN_FETCH_URL + '?after_id=' + this.oldest_local_pin_id + 
                 '&offset=' + this.feed_offset,
            headers: auth.get_authorized_request_header(),
            jar: true
        };
        var self = this;
        request(options, function(error, response, body) {
            try {
                var feed_array = JSON.parse(body)['data'];
                self._append_to_feed(feed_array);   
            }
            catch (err) {
                console.warn(body);
            }

            // re-enable feed scroll event
            self._enable_feed_scroll_event();
        });
    }

    _check_update() {
        var options = {
            method: 'GET',
            url: constants.PIN_FETCH_URL + '?reverse_order=0',
            headers: auth.get_authorized_request_header(),
            jar: true
        };
        var self = this;
        request(options, function(error, response, body) {
            try {
                var feed_array = JSON.parse(body)['data'];
                var array_length = feed_array.length;
            }
            catch (err) {
                console.warn(body);
                return; // give up
            }

            for (var i = 0; i < array_length; i++) {
                var feed_item = feed_array[i];
                if (feed_item['type'] == 'moment') {
                    var pin = new Pin(feed_item);
                    console.log(pin.id);

                    // add extra 10 seconds tolerance when checking
                    if (pin.id != self.latest_local_pin_id &&
                        pin.time + 10 > self.latest_local_pin_time) {

                        // get the first pin, and fetch the rest in _fetch_update()
                        var output = generate_feed_item_html(feed_item);
                        self._fetch_update(pin.id, 0, output);

                        self.server_latest_pin = pin;
                    }
                    break;
                }
            }
        });
    }

    _fetch_update(fetch_after_id, fetch_offset, output) {
        var options = {
            method: 'GET',
            url: constants.PIN_FETCH_URL + '?after_id=' + fetch_after_id + '&offset=' + fetch_offset,
            headers: auth.get_authorized_request_header(),
            jar: true
        };
        var self = this;
        request(options, function(error, response, body) {
            var feed_array = JSON.parse(body)['data'];
            var stop_fetching = false;
            var pin_time;
            console.log(fetch_offset);
    
            for (var i = 0; i < feed_array.length; i++) {
                var feed_item = feed_array[i];
                if (feed_item['type'] == 'moment') {
                    var pin = new Pin(feed_item);
                    if (pin.id == self.latest_local_pin_id ||
                        pin.time + 10 <= self.latest_local_pin_time) {
    
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
                self.latest_local_pin_id = self.server_latest_pin.id;
                self.latest_local_pin_time = self.server_latest_pin.time;
                self._report_latest_viewed_pin_id();

                output = '<div id="update" class="hidden">' + output + '</div>';
                $('.feed').prepend(output);

                // give update 2 seconds to load
                setTimeout(function() {
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
                }, 2000);
            }
            else {
                // make recursive call to fetch more update
                self._fetch_update(fetch_after_id, fetch_offset + 10, output);
            }
        });
    }

    _report_latest_viewed_pin_id() {
        var options = {
            method: 'POST',
            url: constants.PIN_VIEWS_REPORT_URL,
            headers: auth.get_authorized_request_header(),
            form: { 'pin_ids': this.latest_local_pin_id },
            jar: true
        };
        request(options, function(error, response, body) {});
    }

    _append_to_feed(items) {
        var output = '';
        for (var i = 0; i < items.length; i++)
            output += generate_feed_item_html(items[i]);
        $('.feed').append(output);

        this.oldest_local_pin_id = items[items.length - 1]['target']['id'];
        this.feed_offset += 10;
    }

    static delete_pin(id) {
        var options = {
            method: 'DELETE',
            url: constants.PIN_URL + '/' + id,
            headers: auth.get_authorized_request_header(),
            jar: true
        };
        request(options, function(error, response, body) {
            if (JSON.parse(body)['success']) {
                var selector = '[data-id="' + id + '"]';
                $(selector).remove();
            }
        });
    }

    static update_pin_statistics(id) {
        var options = {
            method: 'GET',
            url: constants.PIN_URL + '/' + id,
            headers: auth.get_authorized_request_header(),
            jar: true
        };
        request(options, function(error, response, body) {
            try {
                var pin = new Pin(JSON.parse(body));
            }
            catch (err) {
                console.warn(body);
                return;
            }
            var selector = '.feed-item[data-id="' + id + '"] > .statistics';
            $(selector).replaceWith(pin.get_statistics_html());
        });
    }
}


function display_self_avatar() {
    var options = {
        method: 'GET',
        url: constants.SELF_URL,
        headers: auth.get_authorized_request_header(),
        jar: true
    };
    request(options, function(error, response, body) {
        var body_dict = JSON.parse(body);
        if ("error" in body_dict) {
            display_self_avatar();
        }

        var avatar = body_dict['avatar_url'].replace('_s', ''); // get large image
        $('.title-bar').append('<img class="self-avatar" src="' + avatar + '">');
    });
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
