const randomstring = require('randomstring')

var text = function (length) {
  return randomstring.generate({length: length || 10, charset: 'alphabetic'})
}

module.exports = {
  community: attrs => {
    return new Community(_.merge({
      name: text(),
      slug: text()
    }, attrs))
  },

  post: attrs => {
    return new Post(_.merge({
      name: text()
    }, attrs))
  },

  mock: {
    request: function () {
      return {
        allParams: function () {
          return this.params
        },
        param: function (name) {
          return this.params[name]
        },
        session: {},
        params: {}
      }
    },
    response: function () {
      return {
        ok: () => null,
        serverError: function (err) { throw err },
        locals: {}
      }
    }
  }
}
