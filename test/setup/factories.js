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
      active: true,
      name: text()
    }, attrs))
  },

  project: attrs => {
    return new Project(_.merge({
      title: text(),
      slug: text()
    }, attrs))
  },

  user: attrs => {
    return new User(_.merge({
      name: text(),
      active: true,
      email: format('%s@example.com', text())
    }, attrs))
  },

  network: attrs => {
    return new Network(_.merge({
      name: text(),
      slug: text()
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
        __: sails.__, // this is for i18n
        login: function (userId) {
          _.extend(this.session, {
            authenticated: true,
            version: UserSession.version,
            userId: userId
          })
        }
      }
    },
    response: function () {
      var self = {
        ok: chai.spy(function (data) { self.body = data }),
        serverError: chai.spy(function (err) { throw err }),
        badRequest: chai.spy(function (data) { self.body = data }),
        status: chai.spy(function () { return this }),
        send: chai.spy(function (data) { self.body = data }),
        redirect: chai.spy(function (url) { self.redirected = url }),
        view: chai.spy(function (template, attrs) {
          this.viewTemplate = template
          this.viewAttrs = attrs
        }),
        locals: {}
      }
      return self
    }
  }
}
