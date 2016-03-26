
var fs = require('fs');
var splitter = require('./splitter');

var wordfilter = require('wordfilter');
var codes = require('./codes');

var Markov = require('./markov');
var Twitbot = require('./twitbot');

var chalk = require('chalk');

function maketweet() {
    var s;
    if(m.seeds > 10) {
        for(var i = 0; i < 1000; ++i) {
            s = m.generate().join(' ', 20);
            if(s.length <= 140 && !wordfilter.blacklisted(s)) {
                return s;
            }
        }
    }
}

function logtweet(user, text) {
    if(user === 'emoodji') {
        user = chalk.bgGreen(user + ": ");
    } else {
        user = chalk.green(user + ": ");
    }
    console.log(user, text);
}

function tweet() {
    var t = maketweet();
    if(t) {
        pr = twitter.tweet(t);
        pr.then(function(result) {
            logtweet('emoodji', t);
            console.log(result);
        });
    }
}

var markov = new Markov(1);
var twitter = new Twitbot();

var mood = null;
var moodchar = null;

var save = function() {
    if(mood) {
        markov.save('mood_' + mood.toString(16)).catch(function(e) {
            console.log(chalk.red(e));
        });
    }
};

var setMood = function(newmood) {

    save();

    mood = newmood;
    var filename = 'mood_' + mood.toString(16);
    markov.load(filename);

    moodchar = String.fromCodePoint(mood);

    var profile = 'My mood is ' + moodchar;
    console.log(chalk.cyan(profile));
    twitter.tweet(profile);

    twitter.stream(moodchar, function(s, tweet) {
        if(s === moodchar) {
            save();
            logtweet(tweet.user.screen_name, tweet.text);
            markov.seed(tweet.text);
            return true;
        } else {
            return false;
        }
    });
};

var MINUTE = 60 * 100;

// change moods every 24 hours
var randomMood = function() {
    var idx = Math.floor(10 * Math.random());
    setMood(codes[idx]);
    setTimeout(function() {
        randomMood();
    }, MINUTE * 60 * 24); 
};

randomMood();

// tweet every hour
setInterval(function() {
    tweet();
}, 60 * MINUTE);
