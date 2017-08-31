import { extend, merge, pick, reduce } from 'lodash'
const randomstring = require('randomstring')
import { spy } from 'chai'
import i18n from 'i18n'
import { ReadableStreamBuffer } from 'stream-buffers'

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
      email: `${text()}@example.com`
    }, attrs))
  },

  userConnection: attrs => {
    return new UserConnection(merge({
      type: 'message',
      created_at: new Date(),
      updated_at: new Date()
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
        query: {},
        body: {},
        params: {},
        headers: {},
        __: function (key) {
          i18n.init(this)
          return i18n.__(key)
        },
        login: function (userId) {
          extend(this.session, {
            authenticated: true,
            version: UserSession.version,
            userId: userId
          })
        },
        pipe: function (out) {
          const buf = new ReadableStreamBuffer()
          buf.put(this.body)
          buf.stop()
          return buf.pipe(out)
        }
      }
    },

    response: function () {
      var self

      const setBody = () => spy(data => { self.body = data })

      self = {
        ok: setBody(),
        serverError: spy(err => { throw err }),
        badRequest: setBody(),
        notFound: setBody(),
        forbidden: setBody(),
        status: spy(value => {
          self.statusCode = value
          return self
        }),
        send: setBody(),
        redirect: spy(url => {
          self.redirected = url
        }),
        view: spy((template, attrs) => {
          self.viewTemplate = template
          self.viewAttrs = attrs
        }),
        locals: {},
        headers: {},
        setHeader: spy((key, val) => {
          self.headers[key] = val
        })
      }
      return self
    },

    model: attrs => {
      return merge({
        get: function (name) { return this[name] },
        pick: function () { return pick(this, arguments) },
        toJSON: () => {
          return Object.assign(reduce(attrs.relations, (m, v, k) => {
            m[k] = v.toJSON()
            return m
          }, {}), attrs)
        },
        attributes: attrs
      }, attrs)
    },

    collection: list => {
      return {
        first: () => list[0],
        toJSON: () => list.map(model => model.toJSON()),
        map: fn => list.map(model => fn(model))
      }
    }
  }
}
