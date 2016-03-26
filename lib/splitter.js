
var stream = require('stream');

module.exports = function(delim) {
    var splitter = new stream.Writable();

    var hang = null;

    splitter._write = function (chunk, encoding, done) {
        var split = (''+chunk).split(delim);
        for(var i = 0; i < split.length / 2; ++i) {
            var line = (split[i*2]+split[i*2+1])
                .trim()
                .replace(/^\W+/, '')
                .replace(/\n/g, ' ');
            this.emit('data', line);
        }
        done();
    };

    return splitter;
};
