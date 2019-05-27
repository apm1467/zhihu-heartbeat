const BASE_URL = 'https://api.zhihu.com';
exports.BASE_URL = BASE_URL;

exports.CAPTCHA_URL = BASE_URL + '/captcha';

exports.SIGN_IN_URL = BASE_URL + '/sign_in';

exports.PIN_URL = BASE_URL + '/pins';

exports.PIN_FETCH_URL = BASE_URL + '/pins/moments';

exports.PIN_VIEWS_REPORT_URL = BASE_URL + '/pins/views';

exports.PIN_TOKEN_URL = BASE_URL + '/pins/token';

exports.COMMENT_URL = BASE_URL + '/comments';

const BASE_WEB_URL = 'https://www.zhihu.com';
exports.BASE_WEB_URL = BASE_WEB_URL;

exports.PIN_WEB_URL = BASE_WEB_URL + '/pin';

const PROFILE_URL = BASE_URL + '/people';
exports.PROFILE_URL = PROFILE_URL;

exports.SELF_PROFILE_URL = PROFILE_URL + '/self';

exports.PROFILE_WEB_URL = BASE_WEB_URL + '/people'

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

exports.LOGIN_REQUEST_HEADER = {...CAPTCHA_REQUEST_HEADER, ...BASE_HEADER};

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

const GITHUB_REPO_URL = 'https://github.com/apm1467/zhihu-heartbeat';
exports.GITHUB_REPO_URL = GITHUB_REPO_URL;

exports.GITHUB_ISSUES_URL = GITHUB_REPO_URL + '/issues';

exports.GITHUB_DOWNLOAD_URL = GITHUB_REPO_URL +  '/releases/latest';

exports.GITHUB_CHECK_UPDATE_URL = 'https://raw.githubusercontent.com/apm1467/zhihu-heartbeat/master/version';

// 100x100 pixel black image as fallback video thumbnail
exports.BLANK_THUMBNAIL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAQAAADa613fAAAAaUlEQVR42u3PQREAAAgDoK1/aI3g34MGNJMXKiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiJyWXmfZAEMq/KNAAAAAElFTkSuQmCC';

// downwards arrow
exports.COLLAPSED_INDICATOR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='rgb(106, 175, 253)' width='24' height='40'%3E%3Cpath transform='translate(0,20)' d='M12 13L8.285 9.218a.758.758 0 0 0-1.064 0 .738.738 0 0 0 0 1.052l4.249 4.512a.758.758 0 0 0 1.064 0l4.246-4.512a.738.738 0 0 0 0-1.052.757.757 0 0 0-1.063 0L12 13z'%3E%3C/path%3E%3C/svg%3E";

// CSS for adjusting app scrollbar on Windows
exports.WINDOWS_EXTRA_CSS = `
    ::-webkit-scrollbar {
        width: 9px;
    } 
    ::-webkit-scrollbar:hover {
        background-color: #A1A09F;
    }
    ::-webkit-scrollbar-thumb {
        border-radius: 10px;
        background-color: rgba(0, 0, 0, 0.5);
        border: 1px solid #4B4945;
    }`;
