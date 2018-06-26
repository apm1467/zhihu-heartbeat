const BASE_URL = 'https://api.zhihu.com';
exports.BASE_URL = BASE_URL;

exports.CAPTCHA_URL = BASE_URL + '/captcha';

exports.SIGN_IN_URL = BASE_URL + '/sign_in';

exports.PIN_URL = BASE_URL + '/pins/moments?reverse_order=0';

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

const BASE_HEADER = {
    'x-api-version': '3.0.90',
    'x-app-version': '4.18.2',
    'X-App-VersionCode': '984',
    'x-app-build': 'release',
    'x-app-za': jQuery.param({
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
exports.BASE_REQUEST_HEADER = BASE_HEADER;

// combine two dicts
exports.LOGIN_REQUEST_HEADER = Object.assign({}, CAPTCHA_REQUEST_HEADER, BASE_HEADER);
