import { extend, merge, pick, reduce } from 'lodash'
import { spy } from 'chai'
import i18n from 'i18n'
import { ReadableStreamBuffer } from 'stream-buffers'
import { faker } from '@faker-js/faker'

module.exports = {

  blockedUser: attrs => {
    return new BlockedUser(merge({
      created_at: new Date(),
      updated_at: new Date()
    }, attrs))
  },

  group: attrs => {
    return new Group(merge({
      name: faker.random.words(6),
      slug: faker.lorem.slug(),
      access_code: faker.random.alphaNumeric(6),
      group_data_type: 1,
      settings: {}
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

  postUser: attrs => {
    return new PostUser(merge({
      active: true,
      following: true
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
      email: faker.internet.email(),
      settings: {locale: 'en'},
    }, attrs))
  },

  userConnection: attrs => {
    return new UserConnection(merge({
      type: 'message',
      created_at: new Date(),
      updated_at: new Date()
    }, attrs))
  },

  userVerificationCode: attrs => {
    return new UserVerificationCode(merge({
      created_at: new Date()
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

  skill: attrs => {
    return new Skill(merge({
      name: faker.lorem.word()
    }, attrs))
  },

  device: attrs => {
    return new Device(merge({
      token: faker.datatype.uuid()
    }, attrs))
  },

  activity: attrs => {
    return new Activity(attrs)
  },

  notification: attrs => {
    return new Notification(attrs)
  },

  stripeAccount: attrs => {
    return new StripeAccount(merge({
      stripe_account_external_id: faker.datatype.uuid(),
      refresh_token: faker.datatype.uuid()
    }, attrs))
  },

  groupExtension: attrs => {
    return new GroupExtension(attrs)
  },

  proposalOption: attrs => {
    return new ProposalOption(merge({
      text: faker.random.words(3),
      description: faker.lorem.sentences(2)
    }, attrs))
  },

  proposalVote: attrs => {
    return new ProposalVote(attrs)
  },

  extension: attrs => {
    return new Extension(attrs)
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
        session: {
          regenerate: function(callback) {
            callback()
          }
        },
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
        json: setBody(),
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
        cookies: {},
        setHeader: spy((key, val) => {
          self.headers[key] = val
        }),
        end: setBody(),
        cookie: spy((key, val) => {
          self.cookies[key] = val
        })
      }
      return self
    },

    model: attrs => {
      return merge({
        get: function (name) { return this[name] },
        pick: function () { return pick(this, arguments) },
        load: () => Promise.resolve(),
        related: (type) => attrs.relations ? attrs.relations[type] : null,
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
