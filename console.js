#!/usr/bin/env node

var _ = require('lodash'),
  colors = require('colors'),
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

    repl.on('exit', function() {
      process.exit();
    });

    require('promirepl').promirepl(repl);

  });

})();
