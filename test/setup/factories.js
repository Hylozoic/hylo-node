import { extend, merge, pick, reduce } from 'lodash'
import { spy } from 'chai'
import i18n from 'i18n'
import { ReadableStreamBuffer } from 'stream-buffers'
import faker from 'faker'

module.exports = {
  community: attrs => {
    return new Community(merge({
      name: faker.random.words(6),
      slug: faker.lorem.slug(),
      beta_access_code: faker.random.alphaNumeric(6)
    }, attrs))
  },

  invitation: attrs => {
    return new Invitation(merge({
      token: faker.random.alphaNumeric(36),
      email: faker.internet.email(),
      created_at: new Date()
    }, attrs))
  },

  post: attrs => {
    return new Post(merge({
      active: true,
      name: faker.random.words(4)
    }, attrs))
  },

  comment: attrs => {
    return new Comment(merge({
      active: true,
      text: faker.lorem.sentences(2)
    }, attrs))
  },

  user: attrs => {
    return new User(merge({
      name: faker.name.findName(),
      active: true,
      email: faker.internet.email()
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
      name: faker.company.companyName(),
      slug: faker.lorem.slug(5)
    }, attrs))
  },

  tag: attrs => {
    return new Tag(merge({
      name: faker.random.words(3).replace(/ /g, '-').toLowerCase()
    }, attrs))
  },

  media: attrs => {
    return new Media(merge({
      position: 0,
      type: 'image',
      url: faker.internet.url()
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
        serverError: spy(err => {
          self.statusCode = 500
          self.body = err
        }),
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
