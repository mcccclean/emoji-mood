
var fs = require('fs');
var chalk = require('chalk');
var entities = require('html-entities').AllHtmlEntities;
var wordfilter = require('wordfilter');

var Markov = require('./markov');
var codes = require('./codes');
var debug_log = require('./log');

USE_DUMMY_TWITTER = true;
var Twitbot = require('./twitbot');
var twitter = new Twitbot(true);

function wait(delay) {
    return new Promise(function(resolve, reject) {
        setTimeout(function() {
            resolve();
        }, delay);
    });
}

function logtweet(user, text) {
    if(user === 'emoodji') {
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

function mood_cycle() {
    var mood = {};

    // pick a mood
    mood.idx = Math.floor(codes.length * Math.random());
    mood.code = codes[mood.idx];
    mood.codepoint = mood.code[0];
    mood.name = mood.code[1];
    mood.emoji = String.fromCodePoint(mood.codepoint);

    // initialise markov chain
    mood.filename = 'mood_' + mood.codepoint.toString(16);
    mood.markov = new Markov(1);
    mood.markov.load(mood.filename);

    // tweet profile string
    var profile = 'My mood is ' + mood.emoji + ' ' + mood.name + ' ' + mood.emoji;
    logtweet('emoodji', chalk.cyan(profile));
    twitter.tweet(profile);

    // start monitoring tweets
    var promisechain = twitter.stream(mood.emoji, function(tweet) {
        logtweet(tweet.user.screen_name, tweet.text.replace('\n', ' '));
        mood.markov.seed(tweet.text);
        mood.markov.save(mood.filename);
    }).then(function(stream) {
        mood.stream = stream;  
        return wait(DELAY_BETWEEN_TWEETS);
    });

    // emit a sequence of tweets
    var mktweet = function() {
        var t = maketweet(mood.markov);
        if(t) {
            logtweet('emoodji', t);
            twitter.tweet(t);
        }
        return wait(DELAY_BETWEEN_TWEETS);
    };
    for(var i = 0; i < TWEETS_PER_MOOD; ++i) {
        promisechain = promisechain.then(mktweet);
    }
    
    // stop monitoring tweets
    promisechain = promisechain.then(function() {
        mood.stream.destroy();
    });

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
