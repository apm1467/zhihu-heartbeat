const request = require('request');
const constants = require('./constants');
const auth = require('./auth');


class Author {
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
        this.author = new Author(target['author']);
        this.time = target['updated']; // int
        this.likes = target['reaction_count'];
        this.repins = target['repin_count'];
        this.comments_count = target['comment_count'];
        this.text = '';
        this.image_array = [];
        this.video = ''; // video url

        var content_array = target['content'];

        // handle text & text repin
        if (
            content_array[0]['type'] == 'text' ||
            feed_item['feed_type'] == 'repin' || 
            feed_item['feed_type'] == 'repin_with_comment'
        ) {
            this.text = content_array[0]['content']
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

            // make sure text does not contain script tags
            this.text = this.text.replace(/<script/ig, '');
        }

        // handle media
        var array_length = content_array.length;
        for (var i = 0; i < array_length; i++) {
            if (content_array[i]['type'] == 'link') {
                var url = content_array[i]['url'];
                url = '<a class="link" href="' + url + '">' + url + '</a>';
                var title = content_array[i]['title'];
                this.text += '<div class="link-title">' + title + '</div>' + url;
            }
            if (content_array[i]['type'] == 'image') {
                this.image_array.push(content_array[i]['url']);
            }
            else if (content_array[i]['type'] == 'video') {
                this.video_thumbnail = content_array[i]['thumbnail'];
                var playlist = content_array[i]['playlist'];
                var playlist_length = playlist.length;
                for (var j = 0; j < playlist_length; j++) {
                    if (playlist[j]['quality'] == 'hd') {
                        this.video = playlist[j]['url'];
                        this.video_height = playlist[j]['height'];
                        this.video_width = playlist[j]['width'];
                        break;
                    }
                }
            }
        }
        this.image_count = this.image_array.length;
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

        if (this.image_count > 0) {
            output += '<div class="images">';
            if (this.image_count == 1) {
                // <img class="img single-img" src="...">
                output += '<img class="img single-img" src="' + this.image_array[0] + '">';
            }
            else if (this.image_count == 2) {
                for (var i = 0; i < 2; i++) {
                    // <div class="img double-img" style="background-image: url('...');"></div>
                    output += '<div class="img double-img" style="background-image: url(\''
                              + this.image_array[i] + '\');"></div>';
                }
            }
            else if (this.image_count >= 3) {
                output += '<div class="img-grid"><div class="row">';
                for (var i = 0; i < this.image_count; i++) {
                    // <div class="img" style="background-image: url('...');"></div>
                    output += '<div class="img" style="background-image: url(\''
                              + this.image_array[i] + '\');"></div>';
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
            var array_length = feed_array.length;
            for (var i = 0; i < array_length; i++) {
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
    
            var array_length = feed_array.length;
            for (var i = 0; i < array_length; i++) {
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

    _append_to_feed(feed_array) {
        var output = '';
        var array_length = feed_array.length;
        for (var i = 0; i < array_length; i++) {
            var feed_item_dict = feed_array[i];
            output += generate_feed_item_html(feed_item_dict);
        }
        $('.feed').append(output);

        this.oldest_local_pin_id = feed_array[array_length - 1]['target']['id'];
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
