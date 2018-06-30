var request = require('request');
const constants = require('./constants');
const auth = require('./auth');


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

        this.likes = feed_item['target']['reaction_count'];
        this.repins = feed_item['target']['repin_count'];
        this.comments_count = feed_item['target']['comment_count'];

        var content_array = feed_item['target']['content'];

        // handle text
        this.text = '';
        if (content_array[0]['type'] == 'text') {
            // remove "<script" tag beginnings for extra safety
            // normally html special chars should already been escaped
            this.text = content_array[0]['own_text'].replace(/<script/ig, '');
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
        url: constants.PIN_URL + '?reverse_order=0',
        headers: auth.get_authorized_request_header(),
        jar: true
    };
    request(options, function(error, response, body) {
        var feed_array = JSON.parse(body)['data'];
        console.log(feed_array);

        // save latest_local_pin_id & latest_local_pin_time
        var array_length = feed_array.length;
        for (var i = 0; i < array_length; i++) {
            var feed_item = feed_array[i];
            if (feed_item['type'] == 'moment') {
                pin = new Pin(feed_item);
                localStorage.setItem('latest_local_pin_id', pin.get_id());
                localStorage.setItem('latest_local_pin_time', pin.get_time_str());
                break;
            }
        }

        report_latest_viewed_pin_id();
        append_to_feed(feed_array);
    });
}

exports.fetch_older_feed = function() {
    var oldest_local_pin_id = localStorage.getItem('oldest_local_pin_id');
    var feed_offset = localStorage.getItem('feed_offset');
    var options = {
        method: 'GET',
        url: constants.PIN_URL + '?after_id=' + oldest_local_pin_id + '&offset=' + feed_offset,
        headers: auth.get_authorized_request_header(),
        jar: true
    };
    request(options, function(error, response, body) {
        var feed_array = JSON.parse(body)['data'];
        append_to_feed(feed_array);

        // re-enable infinite scroll
        const renderer = require('./renderer');
        renderer.enable_scroll_event();
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

exports.check_update = function() {
    var options = {
        method: 'GET',
        url: constants.PIN_URL + '?reverse_order=0',
        headers: auth.get_authorized_request_header(),
        jar: true
    };
    request(options, function(error, response, body) {
        var latest_local_pin_id = localStorage.getItem('latest_local_pin_id');
        var latest_local_pin_time = parseInt(localStorage.getItem('latest_local_pin_time'));
        var feed_array = JSON.parse(body)['data'];
        console.log(feed_array);

        var array_length = feed_array.length;
        for (var i = 0; i < array_length; i++) {
            var feed_item = feed_array[i];
            if (feed_item['type'] == 'moment') {
                pin = new Pin(feed_item);
                console.log(pin.get_id());
                console.log(latest_local_pin_id);

                // add extra 10 seconds tolerance when checking
                if (pin.get_id() != latest_local_pin_id &&
                    pin.get_time_int() + 10 > latest_local_pin_time) {

                    // save the first pin, and fetch the rest in fetch_update()
                    var output = generate_feed_item_html(feed_item);
                    fetch_update(pin.get_id(), 0, output, pin);
                }
                break;
            }
        }
    });
}

// fetch_after_id: str; fetch_offset: int; server_latest_pin: Pin
function fetch_update(fetch_after_id, fetch_offset, output, server_latest_pin) {
    var options = {
        method: 'GET',
        url: constants.PIN_URL + '?after_id=' + fetch_after_id + '&offset=' + fetch_offset,
        headers: auth.get_authorized_request_header(),
        jar: true
    };
    request(options, function(error, response, body) {
        var feed_array = JSON.parse(body)['data'];
        var latest_local_pin_id = localStorage.getItem('latest_local_pin_id');
        var latest_local_pin_time = parseInt(localStorage.getItem('latest_local_pin_time'));
        var stop_fetching = false;
        var pin_time;
        console.log(fetch_after_id);
        console.log(latest_local_pin_id);
        console.log(fetch_offset);
        console.log(feed_array);

        var array_length = feed_array.length;
        for (var i = 0; i < array_length; i++) {
            var feed_item = feed_array[i];
            if (feed_item['type'] == 'moment') {
                pin = new Pin(feed_item);

                if (pin.get_id() == latest_local_pin_id ||
                    pin.get_time_int() + 10 <= latest_local_pin_time) {

                    stop_fetching = true;
                    break;
                }
                else {
                    fetch_after_id = pin.get_id();
                    output += generate_feed_item_html(feed_item);
                }
            }
        }
        if (stop_fetching) {
            output = '<div class="update hidden">' + output + '</div>';
            $('.feed').prepend(output);

            // give images 2 seconds to load before calculate height
            setTimeout(function() {
                var scroll_top = $(window).scrollTop();
                $('.update').removeClass('hidden');
                // add .feed-item margin-bottom 12px
                $(window).scrollTop(scroll_top + $('.update').outerHeight(true) + 12);
            }, 2000);

            // display update notification
            $('#update-notification').addClass('notification-show');

            // update latest_local_pin_id & latest_local_pin_time
            localStorage.setItem('latest_local_pin_id', server_latest_pin.get_id());
            report_latest_viewed_pin_id();
            localStorage.setItem('latest_local_pin_time', server_latest_pin.get_time_str());
        }
        else {
            // make recursive call to fetch more update
            fetch_update(fetch_after_id, fetch_offset + 10, output, server_latest_pin);
        }
    });
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
        output += '<div class="time" data-time="' + pin.get_time_str() + '"></div>';
        output += '<div class="statistics">' + pin.get_comments_count_html() +
                  pin.get_repins_html() + pin.get_likes_html() + '</div>';
        output += '<div class="content">' + pin.get_content_html(); 
        // </div> is added at the end

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
                output += '<div class="origin-pin-content">' + 
                          origin_pin.get_content_html() + '</div>';
            }

            output += '</div>';
        }

        output += '</div></div>';
    }
    return output;
}

function report_latest_viewed_pin_id() {
    var latest_local_pin_id = localStorage.getItem('latest_local_pin_id');
    var options = {
        method: 'POST',
        url: constants.PIN_VIEWS_REPORT_URL,
        headers: auth.get_authorized_request_header(),
        form: { pin_ids: latest_local_pin_id },
        jar: true
    };
    request(options, function(error, response, body) {});
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
        $('.title-bar').append('<img class="self-avatar" src="' + avatar + '">')
    });
}
