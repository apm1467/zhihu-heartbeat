var request = require('request');
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
}

class Pin {
    constructor(feed_item) {
        this.id = feed_item['target']['id'];
        this.time = feed_item['target']['updated'];

        this.likes = feed_item['target']['reaction_count'];
        this.repins = feed_item['target']['repin_count'];
        this.comments_count = feed_item['target']['comment_count'];

        var content_array = feed_item['target']['content'];

        // handle text
        this.text = '';
        if (content_array[0]['type'] == 'text') {
            this.text = content_array[0]['own_text'];
        }

        // handle text repin
        if (feed_item['feed_type'] == 'repin' || 
            feed_item['feed_type'] == 'repin_with_comment') {

            var origin_pin_id = feed_item['target']['origin_pin']['id'];
            var repin_id = feed_item['target']['repin']['id'];

            // there is text repin only when origin_pin and repin differ
            if (origin_pin_id != repin_id) {
                this.text = content_array[0]['content']
                    .replace(/<\/a>:\s/g, '</a>：') // use full-width colon
                    .replace('<br><a href="zhihu://pin/feedaction/fold/">收起</a>', '')
                    .replace(/\sdata-\w+=["'][^"']*["']/g, ''); // remove data-* attributes

                /*
                    add repin sign before account names

                    an account name without data-* attributes looks like this:
                    <a href="..." class="member_mention">name</a>

                    with 2 possibilities: class name comes first for url comes first 
                */
                var repin_sign = '<i class="fas fa-retweet"></i>';

                // 1. possibility: class name first
                this.text = this.text.replace(/<a\sclass=["']member_mention["']/g, repin_sign + '<a');

                // 2. possibility: url first
                var urls = this.text.match(/<a\shref=["'][^"']*["']\sclass=["']member_mention["']/g);
                for (var i = 0; i < urls.length; i++) {
                    this.text = this.text.replace(urls[i], repin_sign + urls[i]);
                }
            }
        }

        // make sure text does not contain script tags
        this.text = this.text.replace(/<script/ig, '');

        // handle media
        var image_array = [];
        var array_length = content_array.length;
        for (var i = 0; i < array_length; i++) {
            if (content_array[i]['type'] == 'link') {
                var url = content_array[i]['url'];
                url = '<a class="link" href="' + url + '">' + url + '</a>';
                var title = content_array[i]['title'];
                this.text += '<div class="link-title">' + title + '</div>' + url;
            }
            if (content_array[i]['type'] == 'image') {
                image_array.push(content_array[i]['url']);
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
                    }
                }
            }
        }
        this.image_count = image_array.length;
        this.image_array = image_array;
    }

    get_id() {
        return this.id;
    }
    get_time() {
        return this.time; // int
    }
    get_likes_html() {
        return '<span><i class="far fa-heart"></i>' + this.likes + '</span>';
    }
    get_repins_html() {
        return '<span><i class="fas fa-retweet"></i>' + this.repins + '</span>';
    }
    get_comments_count_html() {
        return '<span><i class="far fa-comment"></i>' + this.comments_count + '</span>';
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
                output += '</div>';
            }
            output += '</div>';
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
                    self.latest_local_pin_id = pin.get_id();
                    self.latest_local_pin_time = pin.get_time();
                    break;
                }
            }

            self._report_latest_viewed_pin_id();
            self._append_to_feed(feed_array);

            // check feed update every few time
            setInterval(function() {
                self._check_feed_update();
            }, constants.FEED_UPDATE_INTERVAL);

            // enable feed scroll event
            self._enable_feed_scroll_event();
        });
    }

    _enable_feed_scroll_event() {
        var self = this;
        $(window).scroll(function () {
            var page_length = $(document).height();
            var scroll_position = $(window).scrollTop();
    
            // Scroll down to fetch older feed.
            if (page_length - scroll_position < 3000) {
                self._fetch_older_feed();
    
                // Unbind scroll event so only one fetch request is sent.
                // The scroll event will be re-enabled in _fetch_older_feed().
                $(window).off('scroll');
            }

            // Scroll to top to clear feed update notification.
            if (scroll_position <= 5) {
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
            var feed_array = JSON.parse(body)['data'];
            self._append_to_feed(feed_array);

            // re-enable feed scroll event after fetch
            self._enable_feed_scroll_event();
        });
    }

    _check_feed_update() {
        var options = {
            method: 'GET',
            url: constants.PIN_FETCH_URL + '?reverse_order=0',
            headers: auth.get_authorized_request_header(),
            jar: true
        };
        var self = this;
        request(options, function(error, response, body) {
            var feed_array = JSON.parse(body)['data'];
            var array_length = feed_array.length;
            for (var i = 0; i < array_length; i++) {
                var feed_item = feed_array[i];
                if (feed_item['type'] == 'moment') {
                    var pin = new Pin(feed_item);
                    console.log(pin.get_id());

                    // add extra 10 seconds tolerance when checking
                    if (pin.get_id() != self.latest_local_pin_id &&
                        pin.get_time() + 10 > self.latest_local_pin_time) {

                        // get the first pin, and fetch the rest in _fetch_feed_update()
                        var output = self._generate_feed_item_html(feed_item);
                        self._fetch_feed_update(pin.get_id(), 0, output);

                        self.server_latest_pin = pin;
                    }
                    break;
                }
            }
        });
    }

    _fetch_feed_update(fetch_after_id, fetch_offset, output) {
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
            console.log(fetch_after_id);
            console.log(fetch_offset);
    
            var array_length = feed_array.length;
            for (var i = 0; i < array_length; i++) {
                var feed_item = feed_array[i];
                if (feed_item['type'] == 'moment') {
                    var pin = new Pin(feed_item);
                    if (pin.get_id() == self.latest_local_pin_id ||
                        pin.get_time() + 10 <= self.latest_local_pin_time) {
    
                        stop_fetching = true;
                        break;
                    }
                    else {
                        fetch_after_id = pin.get_id();
                        output += self._generate_feed_item_html(feed_item);
                    }
                }
            }
            if (stop_fetching) {
                self.latest_local_pin_id = self.server_latest_pin.get_id();
                self.latest_local_pin_time = self.server_latest_pin.get_time();
                self._report_latest_viewed_pin_id();

                output = '<div class="update hidden">' + output + '</div>';
                $('.feed').prepend(output);
    
                // give images 2 seconds to load before calculate height
                setTimeout(function() {
                    var scroll_top = $(window).scrollTop();
                    $('.update').removeClass('hidden');
                    // add .feed-item margin-bottom 12px
                    $(window).scrollTop(scroll_top + $('.update').outerHeight(true) + 12);
    
                    // display feed update notification
                    $('#update-notification').addClass('notification-show');
                }, 2000);
            }
            else {
                // make recursive call to fetch more update
                self._fetch_feed_update(fetch_after_id, fetch_offset + 10, output);
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
            output += this._generate_feed_item_html(feed_item_dict);
        }
        $('.feed').append(output);

        this.oldest_local_pin_id = feed_array[array_length - 1]['target']['id'];
        this.feed_offset += 10;
    }

    _generate_feed_item_html(feed_item) {
        var output = '';
        if (feed_item['type'] == 'moment') {
            var pin = new Pin(feed_item);
            var author = new Author(feed_item['target']['author']);
    
            output += '<div class="feed-item" data-id="' + pin.get_id() + '">';
            output += '<div class="author">' + author.get_avatar_html() + 
                      author.get_name_html() + '</div>';        
            output += '<div class="time" data-time="' + pin.get_time() + '"></div>';
            output += '<div class="statistics">';
            if (author.id == this.self_user_id) {
                // include delete button
                output += '<span class="delete-btn"><i class="fas fa-trash-alt"></i></span>';
            }
            output += pin.get_comments_count_html() +
                      pin.get_repins_html() + pin.get_likes_html() + '</div>';
    
            output += '<div class="content">' + pin.get_content_html();
    
            // if this pin is a repin
            if (feed_item['target']['origin_pin']) {
                output += '<div class="origin-pin">';
                if (feed_item['target']['origin_pin']['is_deleted']) {
                    output += feed_item['target']['origin_pin']['deleted_reason'];
                }
                else {
                    var origin_author = new Author(feed_item['target']['origin_pin']['author']);
                    output += '<div class="author">' + origin_author.get_name_html() + '</div>';
    
                    var origin_pin_item = {};
                    origin_pin_item['target'] = feed_item['target']['origin_pin'];
                    var origin_pin = new Pin(origin_pin_item);
                    output += '<div class="origin-pin-content">' + 
                              origin_pin.get_content_html() + '</div>';
                }
                output += '</div>';
            }
    
            output += '</div></div>';
        }
        return output;
    }

    static delete_pin(id) {
        var options = {
            method: 'DELETE',
            url: constants.PIN_POST_URL + '/' + id,
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
