#!/usr/bin/env node
global.sails = require('./app');

sails.on('lifted', function() {
  var repl = require('repl').start({
    prompt: '> ',
    input: process.stdin,
    output: process.stdout
  });

  repl.on('exit', function() {
    process.exit();
  });

  require('promirepl').promirepl(repl);
})

