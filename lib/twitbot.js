
var twitter = require('twitter');
var wordfilter = require('wordfilter');
var chalk = require('chalk');

var config = require('config');

var debug_log = require('./log');

function Twitbot(dummy) {
    this.dummy = config.get('silent');
    this.name = config.get('username');
    this.client = new twitter(config.get('creds'));
}

Twitbot.prototype.isTweetSuitable = function(t) {
    var text = t.text;
    var tests = [
        ['en', t.lang === 'en'],
        ['bl', !wordfilter.blacklisted(text)],
        ['@s', !(/@\w+/.test(text))],
        ['ww', !(/http/.test(text))],
        ['""', !t.is_quote_tweet],
        ['rt', !t.retweeted_status],
        ['id', t.user.screen_name !== this.name]
    ];
    var s = '';
    var ret = true;
    for(var i = 0; i < tests.length; i++) {
        var test = tests[i];
        if(!test[1]) {
            s += chalk.red(test[0]);
            ret = false;
        } else {
            s += chalk.yellow(test[0]);
        }
    }
    if(ret) {
        s = chalk.green(s);
        return true;
    } else {
        debug_log('rejected tweet');
        return false;
    }
};

Twitbot.prototype.stream = function(s, callback) {
    var client = this.client;
    var me = this;

    return new Promise(function(resolve, reject) {
        var tweets = [];
        client.stream('statuses/filter', { track: s }, function(stream) {
            stream.on('data', function(tweet) {
                if(me.isTweetSuitable(tweet)) {
                    callback(tweet);
                }
            });

            stream.on('error', function(error) {
                debug_log('stream error', chalk.red(error));
                stream.destroy();
            });

            resolve(stream);
        });
    });
};

Twitbot.prototype.search = function(term) {
    var client = this.client;
    var me = this;
    return new Promise(function(resolve, reject) {
        client.get('search/tweets', { lang: 'en', q: term, count: 100 }, function(error, tweets, response) {
            if(error) {
                reject(error);
            } else {
                var filtered = tweets.statuses.filter(function(t) {
                    return me.isTweetSuitable(t);
                });
                resolve(filtered);
            }
        });
    });
};

Twitbot.prototype.profile = function(description) {
    var client = this.client;
    return new Promise(function(resolve, reject) {
        client.post('account/update_profile', { description: description }, function(err, response) {
            if(err) {
                reject(err);
            } else {
                resolve(response);
            }
        });
    });
};

Twitbot.prototype.tweet = function(s) {
    if(this.dummy) {
        return Promise.resolve(s);
    } else {
        var client = this.client;
        return new Promise(function(resolve, reject) {
            client.post('statuses/update', { status: s }, function(err, tweet, response) {
                if(err) {
                    debug_log('tweet error', chalk.red(JSON.stringify(err)));
                    reject(err);
                } else {
                    resolve(tweet);
                }
            });
        });
    }
};

module.exports = Twitbot;
