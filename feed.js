var request = require('request');
const settings = require('./settings');

// append access_token to base_request_header => authorized_request_header
var access_token = localStorage.getItem('access_token');
var authorized_request_header = settings.BASE_REQUEST_HEADER;
authorized_request_header['Authorization'] = 'Bearer ' + access_token;


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
        return '<span class="name">' + this.name + '</div>';
    }
}

class Pin {
    constructor(pin_dict) {
        
    }
}

exports.fetch_feed = function() {
    var options = {
        method: 'GET',
        url: settings.PIN_URL,
        headers: authorized_request_header,
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
            var content_array = feed_array[i]['target']['content'];
            var author_html = '<div class="author">' + author.get_avatar_html() + 
                author.get_name_html() + '</div>';
            var pin_html = '<div class="pin">' + author_html + '</div>';
            $('.feed').append(pin_html);
        }
    }
    return;
}
