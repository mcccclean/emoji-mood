
var START = '%START%';
var END = '%END%';

function Markov(order, hash) {
    this.order = order;
    this.seeds = 0;
    this.chains = {};
    this.hash = hash || function(s) { return s; };
}

Markov.prototype.getChain = function(preceding) {
    var key = preceding.join('|').toLowerCase();
    var a = this.chains[key];
    if(!a) { 
        a = {
            parts: [],
            total: 0
        };
        this.chains[key] = a;
    }
    return a;
};

Markov.prototype.addStep = function(preceding, word, weight) {
    var c = this.getChain(preceding);
    c.total += 1;
    for(var i = 0; i < c.parts.length; ++i) {
        var obj = c.parts[i];
        if(obj.word === word) {
            obj.prob += (weight || 1);
            return;
        }
    }
    // we haven't found our word in this chain; add it
    c.parts.push({ word: word, prob: 1 });
    return;
};

Markov.prototype.seed = function(s, weight) {
    this.seeds += 1;
    if(typeof(s) === 'string') {
        s = s.split(/\s/);
    }
    var chain = new Array(this.order);
    chain.fill(START);

    for(var i = 0; i < s.length; ++i) {
        var word = s[i];
        this.addStep(chain, word, weight);

        // cycle the chain forward
        chain.shift();
        chain.push(word);
    }
    this.addStep(chain, END, weight);
};

Markov.prototype.next = function(preceding) {
    var c = this.getChain(preceding);
    var idx = Math.floor(Math.random() * c.total);
    for(var i = 0; i < c.parts.length; i++) {
        var obj = c.parts[i];
        idx -= obj.prob;
        if(idx < 0) {
            return obj.word;
        }
    }
    return END;
};

Markov.prototype.generate = function(limit) {
    var limit = limit || Number.MAX_SAFE_INTEGER;
    var chain = new Array(this.order);
    chain.fill(START);

    var word;
    var result = [];
    while((word = this.next(chain)) !== END && result.length <= limit) {
        result.push(word);

        chain.shift();
        chain.push(word);
    }

    return result;
};

var fs = require('fs');

Markov.prototype.save = function(filename) {
    var data = {
        seeds: this.seeds,
        order: this.order,
        chains: this.chains
    };
    return new Promise(function(resolve, reject) {
        fs.writeFile(filename, JSON.stringify(data), function(err) {
            if(err) {
                reject(err);
            } else {
                console.log('Saved to', filename);
                resolve();
            }
        });
    });
};

Markov.prototype.load = function(filename) {
    var me = this;
    return new Promise(function(resolve, reject) {
        fs.readFile(filename, function(err, data) {
            if(err) {
                me.seeds = 0;
                me.chains = {};
                reject(err);
            } else {
                var data_obj = JSON.parse(data);
                me.seeds = data_obj.seeds;
                me.order = data_obj.order;
                me.chains = data_obj.chains;
                resolve();
            }
        });
    });
};

module.exports = Markov;
