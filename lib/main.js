
var fs = require('fs');
var chalk = require('chalk');
var entities = require('html-entities').AllHtmlEntities;
var wordfilter = require('wordfilter');

var Markov = require('./markov');
var Twitbot = require('./twitbot');
var codes = require('./codes');

function maketweet() {
    if(markov.seeds > 10) {
        for(var i = 0; i < 1000; ++i) {
            var s = markov.generate().join(' ', 20);
            if(s.length <= 140 && !wordfilter.blacklisted(s)) {
                return entities.decode(s);
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
        logtweet('emoodji', t);
        pr = twitter.tweet(t);
    }
}

var markov = new Markov(1);
//var twitter = new Twitbot();
var twitter = { stream: function() {}, tweet: function() {} };

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

    mood = newmood[0];
    var filename = 'mood_' + mood.toString(16);
    markov.load(filename);

    moodchar = String.fromCodePoint(mood);

    var profile = 'My mood is ' + moodchar + ' ' + newmood[1] + ' ' + moodchar;
    console.log(chalk.cyan(profile));
    twitter.tweet(profile);

    twitter.stream(moodchar, function(s, tweet) {
        if(s === moodchar) {
            logtweet(tweet.user.screen_name, tweet.text);
            markov.seed(tweet.text);
            save();
            return true;
        } else {
            return false;
        }
    });
};

var MINUTE = 60 * 1000 * 0.5;

// change moods every 24 hours
var randomMood = function() {
    var idx = Math.floor(codes.length * Math.random());
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

