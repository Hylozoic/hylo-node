#!/usr/bin/env node

/**
 * n.b.: hella copy-pasted from sails/bin/sails-console.js
 */

var _ = require('lodash'),
  colors = require('colors'),
  fs = require('fs'),
  sails = require('sails');

console.log("Lifting Sails in interactive mode...".blue);

(function() {
  // Try to get `rc` dependency
  var rc;
  try {
    rc = require('rc');
  } catch (e0) {
    try {
      rc = require('sails/node_modules/rc');
    } catch (e1) {
      console.error('Could not find dependency: `rc`.');
      console.error('Your `.sailsrc` file(s) will be ignored.');
      console.error('To resolve this, run:');
      console.error('npm install rc --save');
      rc = function () { return {}; };
    }
  }

  // Start server
  sails.lift(_.merge(rc('sails'), {
    log: {
      noShip: true
    },
    hooks: {
      http: false,
      sockets: false,
      views: false
    }
  }), function(err) {

    var repl = require('repl').start('sails> ');
    try {
      history(repl, require('path').join(sails.config.paths.tmp, '.node_history'));
    } catch (e) {
      console.log('Error finding console history:', e);
    }
    repl.on('exit', function() {
      process.exit();
    });

    require('promirepl').promirepl(repl);

  });

})();


/**
* REPL History
* Pulled directly from https://github.com/tmpvar/repl.history
* with the slight tweak of setting historyIndex to -1 so that
* it works as expected.
*/

function history(repl, file) {

try {
  var stat = fs.statSync(file);
  repl.rli.history = fs.readFileSync(file, 'utf-8').split('\n').reverse();
  repl.rli.history.shift();
  repl.rli.historyIndex = -1;
} catch (e) {}

var fd = fs.openSync(file, 'a'),
  reval = repl.eval;

repl.rli.addListener('line', function(code) {
  if (code && code !== '.history') {
    fs.write(fd, code + '\n');
  } else {
    repl.rli.historyIndex++;
    repl.rli.history.pop();
  }
});

process.on('exit', function() {
  fs.closeSync(fd);
});

repl.commands['.history'] = {
  help: 'Show the history',
  action: function() {
    var out = [];
    repl.rli.history.forEach(function(v, k) {
      out.push(v);
    });
    repl.outputStream.write(out.reverse().join('\n') + '\n');
    repl.displayPrompt();
  }
};
}

