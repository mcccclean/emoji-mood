var chalk = require('chalk');
var moment = require('moment');

var lastlog = undefined;
var dups = 0;

module.exports = function() {
    var args = Array.prototype.slice.call(arguments);
    var name = args[0];
    var message = args.slice(1).join(' ');
    var text = chalk.yellow('[' + name + '] ');
    var stamp = chalk.grey('[' + moment().format('HH:mm:ss') + '] ');
    if(message) {
        text += message;
    }
    if(lastlog === text) {
        dups += 1;
        process.stdout.write('\r' + stamp + text + chalk.grey(' -- x' + dups));
    } else {
        dups = 1;
        process.stdout.write('\n' + stamp + text);
    }
    lastlog = text;
}
