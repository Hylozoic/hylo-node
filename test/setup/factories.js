const randomstring = require('randomstring')
const chai = require('chai')
const sails = require('sails')

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

  user: attrs => {
    return new User(_.merge({
      name: text(),
      email: format('%s@example.com', text())
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
        params: {},
        __: sails.__ // this is for i18n
      }
    },
    response: function () {
      var self = {
        ok: chai.spy(function (data) { self.body = data }),
        serverError: chai.spy(function (err) { throw err }),
        badRequest: chai.spy(function (data) { self.body = data }),
        status: chai.spy(function () { return this }),
        locals: {}
      }
      return self
    }
  }
}
