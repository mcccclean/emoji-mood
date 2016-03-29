# emoji mood

> My current mood is :blush: SMILING FACE WITH SMILING EYES :blush:

Emoji mood is a twitter bot that picks an emoji at random and then
watches twitter for uses of that emoji. It uses those tweets to 
populate a markov chain to then generate emoji-appropriate tweets
of its own.

I'm generally fascinated by emoji, and the purpose of this bot
(aside from being occasionally funny and/or charming) is to give an
idea of how each emoji is generally used. For example, when monitoring
:pig:, emoji mood tends to talk about food a lot more than usual, while
:joy: tends to really like Batman vs Superman.

You can see the thing in action at [@emoji_mood](http://twitter.com/emoji_mood).

## Actually using it

To run it, you'll need to set up the config object in `config/default.js`
like so:

```js 
module.exports = {
    creds: {
        // put in valid twitter api/oauth credentials
        consumer_key: 'abc123',
        consumer_secret: 'def456',
        access_token_key: 'ghi789',
        access_token_secret: 'jkl0ab'
    },
    silent: false   // set to true to never actually tweet
                    // -- handy for debugging
}
```

Then run `npm install` and then `npm start` to start it up.


