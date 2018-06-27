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
    constructor(content_array) {
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

    get_html() {
        var output = '';

        if (this.text) {
            output += '<div class="text">' + this.text + '</div>';
        }

        if (this.image_array) {
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

exports.fetch_feed = function() {
    display_self_avatar()

    var options = {
        method: 'GET',
        url: settings.PIN_URL,
        headers: get_authorized_request_header(),
        jar: true
    };
    request(options, function(error, response, body) {
        var body_dict = JSON.parse(body);
        var feed_array = body_dict['data'];
        console.log(feed_array);
        display_feed(feed_array);
    });
}

function display_feed(feed_array) {
    var array_length = feed_array.length;
    for (var i = 0; i < array_length; i++) {
        var feed_item = feed_array[i];
        if (feed_item['type'] == 'moment') {
            var author = new Author(feed_array[i]['target']['author']);
            var author_html = '<div class="author">' + author.get_avatar_html() + 
                author.get_name_html() + '</div>';

            var pin = new Pin(feed_array[i]['target']['content']);
            var pin_html = '<div class="content">' + pin.get_html() + '</div>';

            var output = '<div class="feed-item">' + author_html + pin_html + '</div>';
            $('.feed').append(output);
        }
    }
    return;
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
