const BASE_URL = 'https://api.zhihu.com';
exports.BASE_URL = BASE_URL;

exports.CAPTCHA_URL = BASE_URL + '/captcha';

exports.SIGN_IN_URL = BASE_URL + '/sign_in';

exports.PIN_URL = BASE_URL + '/pins';

exports.PIN_FETCH_URL = BASE_URL + '/pins/moments';

exports.PIN_VIEWS_REPORT_URL = BASE_URL + '/pins/views';

exports.PIN_TOKEN_URL = BASE_URL + '/pins/token';

exports.BASE_WEB_URL = 'https://www.zhihu.com';

exports.SELF_URL = BASE_URL + '/people/self';

exports.APP_SECRET = 'ecbefbf6b17e47ecb9035107866380';

const CLIENT_ID = '8d5227e0aaaa4797a763ac64e0c3b8';
exports.CLIENT_ID = CLIENT_ID;

exports.AUTH_DATA = {
    'grant_type': 'password',
    'source': 'com.zhihu.android',
    'client_id': CLIENT_ID,
    'signature': '',
    'timestamp': '',
    'username': '',
    'password': '',
};

const CAPTCHA_REQUEST_HEADER = { 'Authorization': 'oauth ' + CLIENT_ID };
exports.CAPTCHA_REQUEST_HEADER = CAPTCHA_REQUEST_HEADER;

const querystring = require('querystring');
const BASE_HEADER = {
    'x-api-version': '3.0.90',
    'x-app-version': '4.18.2',
    'X-App-VersionCode': '984',
    'x-app-build': 'release',
    'x-app-za': querystring.stringify({
        'OS': 'iOS',
        'Release': '11.4',
        'Model': 'iPhone7,2',
        'VersionName': '4.18.2',
        'VersionCode': '984',
        'Width': '750',
        'Height': '1334',
        'DeviceType': 'Phone',
        'Brand': 'Apple',
        'OperatorType': '26207'
    }),
    'x-uuid': 'AFDAPJdyuApLBdYntf8xLa7BMpUJQloGeys=',
    'User-Agent': 'osee2unifiedRelease/4.18.2 (iPhone; iOS 11.4; Scale/2.00)'
};
exports.BASE_HEADER = BASE_HEADER;

// combine two dicts
exports.LOGIN_REQUEST_HEADER = Object.assign({}, CAPTCHA_REQUEST_HEADER, BASE_HEADER);

exports.PIN_PUBLISH_FORM = {
    'source_pin_id': 0,
    'version': 1,
    'token': '',
    'view_permission': 'all',
    'content': ''
};

// needes to be stringified and assigned to PIN_PUBLISH_FORM['content']
exports.PIN_PUBLISH_CONTENT_FORM = [
    {
        'randomTag': 100,
        'mark_end': 0,
        'image_height': 0,
        'width': 0,
        'is_gif': false,
        'image_width': 0,
        'feedCollectionCount': 0,
        'height': 0,
        'duration': 0,
        'mark_start': 0,
        'chapter_index': 0,
        'type': 'text',
        'content': ''
    }
];

exports.FEED_UPDATE_INTERVAL = 20000; // 20 sec

exports.PIN_STATISTICS_UPDATE_INTERVAL = 600000; // 10 min

exports.GITHUB_REPO_URL = 'https://github.com/apm1467/zhihu-heartbeat/';

exports.GITHUB_DOWNLOAD_URL = 'https://github.com/apm1467/zhihu-heartbeat/releases/latest';

exports.GITHUB_CHECK_UPDATE_URL = 'https://api.github.com/repos/apm1467/zhihu-heartbeat/releases/latest';
