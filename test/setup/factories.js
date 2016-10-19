import { extend, merge, pick } from 'lodash'
const randomstring = require('randomstring')
import { spy } from 'chai'
const sails = require('sails')

var text = function (length) {
  return randomstring.generate({length: length || 10, charset: 'alphabetic'})
}

module.exports = {
  community: attrs => {
    return new Community(merge({
      name: text(),
      slug: text()
    }, attrs))
  },

  post: attrs => {
    return new Post(merge({
      active: true,
      name: text()
    }, attrs))
  },

  comment: attrs => {
    return new Comment(merge({
      active: true,
      text: text()
    }, attrs))
  },

  user: attrs => {
    return new User(merge({
      name: text(),
      active: true,
      email: format('%s@example.com', text())
    }, attrs))
  },

  network: attrs => {
    return new Network(merge({
      name: text(),
      slug: text()
    }, attrs))
  },

  tag: attrs => {
    return new Tag(merge({
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
        params: {},
        headers: {},
        __: sails.__, // this is for i18n
        login: function (userId) {
          extend(this.session, {
            authenticated: true,
            version: UserSession.version,
            userId: userId
          })
        }
      }
    },

    response: function () {
      var self = {
        ok: spy(data => self.body = data),
        serverError: spy(err => { throw err }),
        badRequest: spy(data => self.body = data),
        notFound: spy(function notFound (data) { this.body = data }),
        forbidden: spy(data => self.body = data),
        status: spy(value => { self.statusCode = value; return self }),
        send: spy(data => self.body = data),
        redirect: spy(url => self.redirected = url),
        view: spy((template, attrs) => {
          self.viewTemplate = template
          self.viewAttrs = attrs
        }),
        locals: {}
      }
      return self
    },

    model: attrs => {
      return merge({
        get: function (name) { return this[name] },
        pick: function () { return pick(this, arguments) },
        attributes: attrs
      }, attrs)
    },

    collection: list => {
      return {
        first: () => list[0]
      }
    }
  }
}
