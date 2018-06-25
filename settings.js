const BASE_URL = 'https://api.zhihu.com';
exports.BASE_URL = BASE_URL;

exports.CAPTCHA_URL = BASE_URL + '/captcha';

exports.SIGN_IN_URL = BASE_URL + '/sign_in';

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

exports.LOGIN_HEADER = {
    'Authorization': 'oauth ' + CLIENT_ID,
    'x-api-version': '3.0.54',
    'x-app-version': '4.18.0',
    'x-app-build': 'release',
    'x-app-za': jQuery.param({
        'OS': 'Android',
        'Release': '6.0',
        'Model': 'Google Nexus 5 - 6.0.0 - API 23 - 1080x1920',
        'VersionName': '4.18.0',
        'VersionCode': '477',
        'Width': '1080',
        'Height': '1920',
        'Installer': 'Google Play',
    }),
    'x-uuid': 'AHBCVBVCDAtLBfZCo1SYbPj8SgivYjqcGCs=',
    'User-Agent': 'Futureve/4.18.0 Mozilla/5.0 (Linux; Android 6.0; ' +
                  'Google Nexus 5 - 6.0.0 - API 23 - 1080x1920 Build/MRA58K; wv) ' +
                  'AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 ' +
                  'Chrome/44.0.2403.119 Mobile Safari/537.36 ' +
                  'Google-HTTP-Java-Client/1.22.0 (gzip)'
}
