import nock from 'nock'
const root = require('root-path')
require(root('test/setup'))
var factories = require(root('test/setup/factories'))
const model = factories.mock.model

const destroyAllPushNotifications = () => {
  return PushNotification.fetchAll()
  .then(pns => pns.map(pn => pn.destroy()))
}

const relations = [
  'activity',
  'activity.post',
  'activity.post.user',
  'activity.post.communities',
  'activity.comment',
  'activity.comment.user',
  'activity.comment.post',
  'activity.comment.post.communities',
  'activity.community',
  'activity.reader',
  'activity.actor'
]

describe('Notification', function () {
  var post, comment, activity, community, reader, actor, device

  before(() => {
    return factories.user({name: 'Joe'}).save()
    .then(u => actor = u)
    .then(() => factories.post({name: 'My Post', user_id: actor.id, description: 'The body of the post'}).save())
    .then(p => post = p)
    .then(() => new Comment({text: 'hi', user_id: actor.id, post_id: post.id}).save())
    .then(c => comment = c)
    .then(() => factories.community({name: 'My Community'}).save())
    .then(c => community = c)
    .then(() => community.posts().attach(post))
    .then(() => factories.user({email: 'readersemail@hylo.com'}).save())
    .then(u => reader = u)
    .then(() => new Device({
      user_id: reader.id,
      token: 'eieio',
      version: 20,
      enabled: true
    }).save())
    .then(d => device = d)
    .then(() => new Activity({
      post_id: post.id
    }).save())
    .then(a => activity = a)
  })

  beforeEach(() => destroyAllPushNotifications())

  describe('.send', () => {
    beforeEach(() => {
      nock(OneSignal.host).post('/api/v1/notifications')
      .reply(200, {result: 'success'})
    })

    it('sends a push for a new post', () => {
      return new Activity({
        post_id: post.id,
        meta: {reasons: [`newPost: ${community.id}`]},
        reader_id: reader.id,
        actor_id: actor.id
      }).save()
      .then(activity => new Notification({
        activity_id: activity.id,
        medium: Notification.MEDIUM.Push
      }).save())
      .then(notification => notification.load(relations))
      .then(notification => notification.send())
      .then(() => PushNotification.where({device_token: device.get('token')}).fetchAll())
      .then(pns => {
        expect(pns).to.exist
        expect(pns.length).to.equal(1)
        var pn = pns.first()
        expect(pn.get('alert')).to.equal('Joe posted "My Post" in My Community')
      })
    })

    it('sends a push for a mention in a post', () => {
      return new Activity({
        post_id: post.id,
        meta: {reasons: ['mention']},
        reader_id: reader.id,
        actor_id: actor.id
      }).save()
      .then(activity => new Notification({
        activity_id: activity.id,
        medium: Notification.MEDIUM.Push
      }).save())
      .then(notification => notification.load(relations))
      .then(notification => notification.send())
      .then(() => PushNotification.where({device_token: device.get('token')}).fetchAll())
      .then(pns => {
        expect(pns).to.exist
        expect(pns.length).to.equal(1)
        var pn = pns.first()
        expect(pn.get('alert')).to.equal('Joe mentioned you in "My Post"')
      })
    })

    it('sends a push for a comment', () => {
      return new Activity({
        comment_id: comment.id,
        meta: {reasons: ['newComment']},
        reader_id: reader.id,
        actor_id: actor.id
      }).save()
      .then(activity => new Notification({
        activity_id: activity.id,
        medium: Notification.MEDIUM.Push
      }).save())
      .then(notification => notification.load(relations))
      .then(notification => notification.send())
      .then(() => PushNotification.where({device_token: device.get('token')}).fetchAll())
      .then(pns => {
        expect(pns).to.exist
        expect(pns.length).to.equal(1)
        var pn = pns.first()
        expect(pn.get('alert')).to.equal(`Joe: "${comment.get('text')}" (in "My Post")`)
      })
    })

    it('sends a push for a mention in a comment', () => {
      return new Activity({
        comment_id: comment.id,
        meta: {reasons: ['commentMention']},
        reader_id: reader.id,
        actor_id: actor.id
      }).save()
      .then(activity => new Notification({
        activity_id: activity.id,
        medium: Notification.MEDIUM.Push
      }).save())
      .then(notification => notification.load(relations))
      .then(notification => notification.send())
      .then(() => PushNotification.where({device_token: device.get('token')}).fetchAll())
      .then(pns => {
        expect(pns).to.exist
        expect(pns.length).to.equal(1)
        var pn = pns.first()
        expect(pn.get('alert')).to.equal('Joe mentioned you: "hi" (in "My Post")')
      })
    })

    it('sends an email for a mention in a post', () => {
      var originalMethod = Email.sendPostMentionNotification

      Email.sendPostMentionNotification = spy(opts => {
        expect(opts).to.contain({
          email: 'readersemail@hylo.com'
        })

        expect(opts.sender).to.contain({
          name: 'Joe (via Hylo)'
        })

        expect(opts.data).to.contain({
          community_name: 'My Community',
          post_user_name: 'Joe',
          post_description: 'The body of the post',
          post_title: 'My Post'
        })
      })

      return new Activity({
        post_id: post.id,
        meta: {reasons: ['mention']},
        reader_id: reader.id,
        actor_id: actor.id
      }).save()
      .then(activity => new Notification({
        activity_id: activity.id,
        medium: Notification.MEDIUM.Email
      }).save())
      .then(notification => notification.load(relations))
      .then(notification => notification.send())
      .then(() => {
        expect(Email.sendPostMentionNotification).to.have.been.called()
      })
      .then(() => {
        Email.sendPostMentionNotification = originalMethod
      })
    })

    it('sends an email for a comment', () => {
      var originalMethod = Email.sendNewCommentNotification

      Email.sendNewCommentNotification = spy(opts => {
        expect(opts).to.contain({
          email: 'readersemail@hylo.com'
        })

        expect(opts.sender).to.contain({
          name: 'Joe (via Hylo)'
        })

        expect(opts.data).to.contain({
          community_name: 'My Community',
          commenter_name: 'Joe',
          post_title: 'My Post'
        })
      })

      return new Activity({
        comment_id: comment.id,
        meta: {reasons: ['newComment']},
        reader_id: reader.id,
        actor_id: actor.id
      }).save()
      .then(activity => new Notification({
        activity_id: activity.id,
        medium: Notification.MEDIUM.Email
      }).save())
      .then(notification => notification.load(relations))
      .then(notification => notification.send())
      .then(() => {
        expect(Email.sendNewCommentNotification).to.have.been.called()
      })
      .then(() => {
        Email.sendNewCommentNotification = originalMethod
      })
    })

    it('sends an email for a mention in a comment', () => {
      var originalMethod = Email.sendNewCommentNotification

      Email.sendNewCommentNotification = spy(opts => {
        expect(opts).to.contain({
          email: 'readersemail@hylo.com',
          version: 'mention'
        })

        expect(opts.sender).to.contain({
          name: 'Joe (via Hylo)'
        })

        expect(opts.data).to.contain({
          community_name: 'My Community',
          commenter_name: 'Joe',
          post_title: 'My Post'
        })
      })

      return new Activity({
        comment_id: comment.id,
        meta: {reasons: ['commentMention']},
        reader_id: reader.id,
        actor_id: actor.id
      }).save()
      .then(activity => new Notification({
        activity_id: activity.id,
        medium: Notification.MEDIUM.Email
      }).save())
      .then(notification => notification.load(relations))
      .then(notification => notification.send())
      .then(() => {
        expect(Email.sendNewCommentNotification).to.have.been.called()
      })
      .then(() => {
        Email.sendNewCommentNotification = originalMethod
      })
    })
  })

  describe('#findUnsent', () => {
    it('returns the unsent', () => {
      return Promise.join(
        new Notification({
          activity_id: activity.id,
          medium: Notification.MEDIUM.Email,
          sent_at: (new Date()).toISOString()
        }).save(),
        new Notification({
          activity_id: activity.id,
          medium: Notification.MEDIUM.Push
        }).save(),
        new Notification({
          activity_id: activity.id,
          medium: Notification.MEDIUM.InApp
        }).save())
      .then(() => Notification.findUnsent())
      .then(notifications => {
        expect(notifications.length).to.equal(2)
        expect(notifications.pluck('medium').sort()).to.deep.equal([
          Notification.MEDIUM.Push,
          Notification.MEDIUM.InApp
        ].sort())
      })
    })
  })

  describe('sendCommentNotificationEmail', () => {
    var original, args, community
    beforeEach(() => {
      original = Email.sendNewCommentNotification
      Email.sendNewCommentNotification = spy(x => args = x)
      community = factories.community()
      return community.save()
    })

    afterEach(() => {
      Email.sendNewCommentNotification = original
    })

    it('sets the correct email attributes', () => {
      const note = new Notification()

      note.relations = {
        activity: model({
          comment_id: 5,
          relations: {
            comment: model({
              id: 5,
              text: 'I have an opinion',
              relations: {
                post: model({
                  name: 'hello world',
                  relations: {
                    communities: [community]
                  }
                }),
                user: model({
                  id: 2,
                  name: 'Ka Mentor'
                })
              }
            }),
            reader: new User({
              id: 1,
              name: 'Reader Person',
              email: 'ilovenotifications@foo.com',
              created_at: new Date()
            })
          }
        })
      }

      return note.sendCommentNotificationEmail()
      .then(() => {
        expect(Email.sendNewCommentNotification).to.have.been.called()
        expect(args.data.post_label).to.equal('"hello world"')
      })
    })
  })
})
