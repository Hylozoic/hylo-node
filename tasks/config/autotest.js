const gaze = require('gaze')
const minimist = require('minimist')
const child = require('child_process')
const debounce = require('lodash/debounce')

module.exports = function (grunt) {
  grunt.registerTask('autotest', function () {
    this.async()

    const argv = minimist(process.argv)
    const file = argv.file || argv.f || ''
    const cmd = `npm test -s -- -b -R min ${file}`

    gaze([
      'api/**/*',
      'config/**/*',
      'lib/**/*',
      'test/**/*'
    ], function (_, watcher) {
      this.on('all', debounce(() => {
        child.spawn('bash', ['-c', cmd], {stdio: 'inherit'})
      }, 2000, true))
    })
  })
}
