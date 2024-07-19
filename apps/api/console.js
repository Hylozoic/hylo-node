#!/usr/bin/env node

/**
 * n.b.: hella copy-pasted from sails/bin/sails-console.js
 */

require("@babel/register")
const _ = require('lodash')
const fs = require('fs')
const sails = require('sails')

;(function () {
  // Try to get `rc` dependency
  var rc
  try {
    rc = require('rc')
  } catch (e0) {
    try {
      rc = require('sails/node_modules/rc')
    } catch (e1) {
      console.error('Could not find dependency: `rc`.')
      console.error('Your `.sailsrc` file(s) will be ignored.')
      console.error('To resolve this, run:')
      console.error('npm install rc --save')
      rc = () => ({})
    }
  }

  // Start server
  sails.lift(_.merge(rc('sails'), {
    log: {
      noShip: true
    },
    // comment out all of this hook-disabling to test sockets from the console
    hooks: {
      http: false,
      sockets: false,
      views: false
    }
  }), function (err) { // eslint-disable-line
    var repl = require('repl').start('sails> ')
    try {
      history(repl, require('path').join(sails.config.paths.tmp, '.node_history'))
    } catch (e) {}
    repl.on('exit', function () {
      process.exit()
    })

    if (process.env.PROMIREPL) {
      require('promirepl').promirepl(repl)
    } else {
      require('async-repl/stubber')(repl)
    }
  })
})()

/**
* REPL History
* Pulled directly from https://github.com/tmpvar/repl.history
* with the slight tweak of setting historyIndex to -1 so that
* it works as expected.
*/

function history (repl, file) {
  try {
    repl.rli.history = fs.readFileSync(file, 'utf-8').split('\n').reverse()
    repl.rli.history.shift()
    repl.rli.historyIndex = -1
  } catch (e) {}

  var fd = fs.openSync(file, 'a')

  repl.rli.addListener('line', function (code) {
    if (code && code !== '.history') {
      fs.write(fd, code + '\n', () => {})
    } else {
      repl.rli.historyIndex++
      repl.rli.history.pop()
    }
  })

  process.on('exit', function () {
    fs.closeSync(fd)
  })

  repl.commands['.history'] = {
    help: 'Show the history',
    action: function () {
      var out = []
      repl.rli.history.forEach(function (v, k) {
        out.push(v)
      })
      repl.outputStream.write(out.reverse().join('\n') + '\n')
      repl.displayPrompt()
    }
  }
}
