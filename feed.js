var request = require('request');
const settings = require('./settings');


class Author {
    constructor(author_dict) {
        this.name = author_dict['name'];
        this.avatar = author_dict['avatar_url'];
        this.url = author_dict['url'];
    }

    get_avatar_html() {
        return '<img class="avatar" src="' + this.avatar + '">';
    }
    get_name_html() {
        return '<span class="name">' + this.name + '</span>';
    }
}

class Pin {
    constructor(feed_item) {
        this.id = feed_item['target']['id'];
        this.time = feed_item['target']['updated'];

        var content_array = feed_item['target']['content'];

        // handle text
        this.text = '';
        if (content_array[0]['type'] == 'text') {
            this.text = content_array[0]['own_text'];
        }

        // handle images
        var image_array = [];
        var array_length = content_array.length;
        for (var i = 0; i < array_length; i++) {
            if (content_array[i]['type'] == 'image') {
                image_array.push(content_array[i]['url']);
            }
        }
        this.image_count = image_array.length;
        this.image_array = image_array;
    }

    get_id() {
        return this.id;
    }
    get_time_int() {
        return this.time;
    }
    get_time_str() {
        return this.time.toString();
    }
    get_html() {
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
                // <div class="img double-img" style="background-image: url('...');"></div>
                output += '<div class="img double-img" style="background-image: url(\''
                          + this.image_array[0] + '\');"></div>';
                output += '<div class="img double-img" style="background-image: url(\''
                          + this.image_array[1] + '\');"></div>';
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
                output += '</div></div>';
            }
            output += '</div>';
        }

        return output;
    }
}


exports.fetch_initial_feed = function() {
    display_self_avatar()
    localStorage.setItem('feed_offset', '0'); // needed when fetching older feed

    var options = {
        method: 'GET',
        url: settings.PIN_URL + '?reverse_order=0',
        headers: get_authorized_request_header(),
        jar: true
    };
    request(options, function(error, response, body) {
        var body_dict = JSON.parse(body);
        var feed_array = body_dict['data'];
        console.log(feed_array);
        append_to_feed(feed_array);
    });
}

exports.fetch_older_feed = function() {
    var oldest_local_pin_id = localStorage.getItem('oldest_local_pin_id');
    var feed_offset = localStorage.getItem('feed_offset');
    var options = {
        method: 'GET',
        url: settings.PIN_URL + '?after_id=' + oldest_local_pin_id + '&offset=' + feed_offset,
        headers: get_authorized_request_header(),
        jar: true
    };
    request(options, function(error, response, body) {
        var feed_array = JSON.parse(body)['data'];
        append_to_feed(feed_array);

        // re-enable infinite scroll
        const renderer = require('./renderer');
        renderer.enable_infinite_scroll();
    });
}

function append_to_feed(feed_array) {
    var output = '';
    var array_length = feed_array.length;
    for (var i = 0; i < array_length; i++) {
        var feed_item_dict = feed_array[i];
        output += generate_feed_item_html(feed_item_dict);
    }
    $('.feed').append(output);

    // save oldest_local_pin_id & feed_offset
    var oldest_local_pin_id = feed_array[array_length - 1]['target']['id'];
    localStorage.setItem('oldest_local_pin_id', oldest_local_pin_id);

    var feed_offset = localStorage.getItem('feed_offset');
    feed_offset = parseInt(feed_offset) + 10;
    localStorage.setItem('feed_offset', feed_offset.toString());
}

// feed_item: dict
function generate_feed_item_html(feed_item) {
    var output = '';
    if (feed_item['type'] == 'moment') {
        output += '<div class="feed-item">';

        var author = new Author(feed_item['target']['author']);
        output += '<div class="author">' + author.get_avatar_html() + 
                  author.get_name_html() + '</div>';

        var pin = new Pin(feed_item);
        output += '<div class="content">' + pin.get_html(); // </div> tag is added at the end

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
                origin_pin_item['target'] = feed_item['target']['origin_pin']
                var origin_pin = new Pin(origin_pin_item);
                output += '<div class="origin-pin-content">' + origin_pin.get_html() + '</div>';
            }

            output += '</div>';
        }

        output += '</div></div>';
    }
    return output;
}

function display_self_avatar() {
    var options = {
        method: 'GET',
        url: settings.SELF_URL,
        headers: get_authorized_request_header(),
        jar: true
    };
    request(options, function(error, response, body) {
        var body_dict = JSON.parse(body);
        var avatar = body_dict['avatar_url'].replace('_s', ''); // get large image
        $('.title-bar').append('<img class="self-avatar" src="' + avatar + '">')
    });
}

function get_authorized_request_header() {
    // append access_token to base_request_header => authorized_request_header
    var access_token = localStorage.getItem('access_token');
    var header = settings.BASE_REQUEST_HEADER;
    header['Authorization'] = 'Bearer ' + access_token;
    return header;
}
