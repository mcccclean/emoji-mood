
var fs = require('fs');
var chalk = require('chalk');
var entities = require('html-entities').AllHtmlEntities;
var wordfilter = require('wordfilter');

var Markov = require('./markov');
var codes = require('./codes');
var debug_log = require('./log');

var Twitbot = require('./twitbot');
var twitter = new Twitbot();

function wait(delay) {
    return new Promise(function(resolve, reject) {
        setTimeout(function() {
            resolve();
        }, delay);
    });
}

function logtweet(user, text) {
    if(user === twitter.name) {
        user = chalk.bgGreen(chalk.black(user + ": "));
    } else {
        user = chalk.green(user + ": ");
    }
    debug_log('@', user, text);
}

function maketweet(markov) {
    if(markov.seeds > 10) {
        for(var i = 0; i < 1000; ++i) {
            var s = markov.generate().join(' ', 20);
            if(s.length <= 140 && !wordfilter.blacklisted(s)) {
                return entities.decode(s);
            }
        }
    } else {
        debug_log('Making tweet', 'not enough seeds. (' + markov.seeds + ')');
    }
}

var MINUTE = 60 * 1000;
var DELAY_BETWEEN_TWEETS = MINUTE * 60;
var TWEETS_PER_MOOD = 11;

var MOODS_FILENAME = 'mood_chosen';

function init_mood(mood) {
    return (new Promise(function(resolve, reject) {
        debug_log('status', 'read previous moods from file');
        fs.readFile(MOODS_FILENAME, function(err, data) {
            if(err) {
                resolve([]);
            } else {
                resolve(String(data).split(' ').map(function(s) {
                    return Number(s);
                }));
            }
        });
    })).then(function(previous_moods) {
        return new Promise(function(resolve, reject) {
            debug_log('status', 'pick mood index -- ignore ' + JSON.stringify(previous_moods));
            var idx;
            do {
                idx = Math.floor(codes.length * Math.random());
            } while(previous_moods.indexOf(idx) >= 0);

            previous_moods.push(idx);
            while(previous_moods.length > 10) {
                previous_moods.shift();
            }

            fs.writeFile(MOODS_FILENAME, previous_moods.join(' '), function() {
                resolve(idx);
            });
        });
    }).then(function(idx) {
        debug_log('status', 'initialise mood with idx ' + idx);
        mood.idx = idx;
        mood.markov = new Markov(1);
        mood.code = codes[mood.idx];
        mood.codepoint = mood.code[0];
        mood.name = mood.code[1];
        mood.emoji = String.fromCodePoint(mood.codepoint);
        mood.filename = 'mood_' + mood.codepoint.toString(16);

        return Promise.resolve();
    });
}

function mood_cycle() {

    var mood = {};

    var promisechain = init_mood(mood).then(function() {
        debug_log('status', 'load previous markov chain state');
        return mood.markov.load(mood.filename);
    }).then(function() {
        debug_log('status', 'tweet profile string');
        var profile = 'My mood is ' + mood.emoji + ' ' + mood.name + ' ' + mood.emoji;
        logtweet(twitter.name, chalk.cyan(profile));
        return twitter.tweet(profile);
    }).then(function() {
        debug_log('status', 'create a stream to start monitoring tweets');
        return twitter.stream(mood.emoji, function(tweet) {
            logtweet(tweet.user.screen_name, tweet.text.replace('\n', ' '));
            mood.markov.seed(tweet.text);
            mood.markov.save(mood.filename);
        });
    }).then(function(stream) {
        debug_log('status', 'keep a reference to the stream');
        mood.stream = stream;  
        return wait(DELAY_BETWEEN_TWEETS);
    });

    var mktweet = function() {
        debug_log('status', 'emit a sequence of tweets');
        var t = maketweet(mood.markov);
        if(t) {
            logtweet(twitter.name, t);
            twitter.tweet(t);
        }
        return wait(DELAY_BETWEEN_TWEETS);
    };
    for(var i = 0; i < TWEETS_PER_MOOD; ++i) {
        promisechain = promisechain.then(mktweet);
    }
    
    promisechain = promisechain.then(function() {
        debug_log('status', 'stop monitoring tweets');
        mood.stream.destroy();
    });

    // handle any errors
    promisechain = promisechain.catch(function(e) {
        debug_log('exception', chalk.red(e.message));
        mood.stream.destroy();
    });

    return promisechain;
}

function mood_loop() {
    mood_cycle().then(function() {
        mood_loop();
    });
};

mood_loop();
