
var twitter = require('twitter');
var wordfilter = require('wordfilter');
var chalk = require('chalk');

var c = require('config').creds;

function Twitbot() {
    this.client = new twitter({
        consumer_key: c.consumer_key,
        consumer_secret: c.consumer_secret,
        access_token_key: c.access_token_key,
        access_token_secret: c.access_token_secret
    });
}

Twitbot.prototype.isTweetSuitable = function(t) {
    var text = t.text;
    var tests = [
        ['en', t.lang === 'en'],
        ['bl', !wordfilter.blacklisted(text)],
        ['@s', !(/@\w+/.test(text))],
        ['ww', !(/http/.test(text))],
        ['""', !t.is_quote_tweet],
        ['rt', !t.retweeted_status]
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
        console.log(s, text);
        return false;
    }
};

Twitbot.prototype.stream = function(s, callback) {
    var client = this.client;
    var me = this;

    var tweets = [];
    client.stream('statuses/filter', { track: s }, function(stream) {
        stream.on('data', function(tweet) {
            if(me.isTweetSuitable(tweet)) {
                if(!callback(s, tweet)) {
                    stream.destroy();
                }
            }
        });

        stream.on('error', function(error) {
            console.log(chalk.red(error));
            stream.destroy();
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
    var client = this.client;
    return new Promise(function(resolve, reject) {
        client.post('statuses/update', { status: s }, function(err, tweet, response) {
            if(err) {
                console.log(chalk.red(JSON.stringify(err)));
                reject(err);
            } else {
                resolve(tweet);
            }
        });
    });
};

module.exports = Twitbot;
