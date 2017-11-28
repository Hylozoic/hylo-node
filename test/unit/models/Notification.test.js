import ioClient from 'socket.io-client'
import io from 'socket.io'
import redis from 'socket.io-redis'

import '../../setup'
import factories from '../../setup/factories'
import { spyify, unspyify, mockify } from '../../setup/helpers'
import { userRoom } from '../../../api/services/Websockets'

const { model } = factories.mock

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
    .then(u => { actor = u })
    .then(() => factories.post({name: 'My Post', user_id: actor.id, description: 'The body of the post'}).save())
    .then(p => { post = p })
    .then(() => new Comment({text: 'hi', user_id: actor.id, post_id: post.id}).save())
    .then(c => { comment = c })
    .then(() => factories.community({name: 'My Community'}).save())
    .then(c => { community = c })
    .then(() => community.posts().attach(post))
    .then(() => factories.user({email: 'readersemail@hylo.com'}).save())
    .then(u => { reader = u })
    .then(() => new Device({
      user_id: reader.id,
      token: 'eieio',
      version: 20,
      enabled: true
    }).save())
    .then(d => { device = d })
    .then(() => new Activity({
      post_id: post.id
    }).save())
    .then(a => { activity = a })
  })

  beforeEach(() => destroyAllPushNotifications())

  describe('.send', () => {
    beforeEach(() => mockify(OneSignal, 'notify'))
    afterEach(() => unspyify(OneSignal, 'notify'))

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
      .then(() => PushNotification.where({device_id: device.id}).fetchAll())
      .then(pns => {
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
      .then(() => PushNotification.where({device_id: device.id}).fetchAll())
      .then(pns => {
        expect(pns.length).to.equal(1)
        var pn = pns.first()
        expect(pn.get('alert')).to.equal('Joe mentioned you in "My Post"')
      })
    })

    describe('with a user with push notifications for comments enabled', () => {
      it('sends no push for a comment', () => {
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
        .then(() => PushNotification.where({device_id: device.id}).fetchAll())
        .then(pns => expect(pns.length).to.equal(0))
      })
    })

    describe('to a user with push notifications for comments enabled', () => {
      beforeEach(() => reader.addSetting({comment_notifications: 'push'}, true))
      afterEach(() => reader.removeSetting('comment_notifications', true))

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
        .then(() => PushNotification.where({device_id: device.id}).fetchAll())
        .then(pns => {
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
        .then(() => PushNotification.where({device_id: device.id}).fetchAll())
        .then(pns => {
          expect(pns.length).to.equal(1)
          var pn = pns.first()
          expect(pn.get('alert')).to.equal('Joe mentioned you: "hi" (in "My Post")')
        })
      })
    })

    it('sends a push for a join request', () => {
      return new Activity({
        meta: {reasons: ['joinRequest']},
        reader_id: reader.id,
        actor_id: actor.id,
        community_id: community.id
      }).save()
      .then(activity => new Notification({
        activity_id: activity.id,
        medium: Notification.MEDIUM.Push
      }).save())
      .then(notification => notification.load(relations))
      .then(notification => notification.send())
      .then(() => PushNotification.where({device_id: device.id}).fetchAll())
      .then(pns => {
        expect(pns.length).to.equal(1)
        var pn = pns.first()
        expect(pn.get('alert')).to.equal('Joe asked to join My Community')
      })
    })

    it('sends a push for an approved join request', () => {
      return new Activity({
        meta: {reasons: ['approvedJoinRequest']},
        reader_id: reader.id,
        actor_id: actor.id,
        community_id: community.id
      }).save()
      .then(activity => new Notification({
        activity_id: activity.id,
        medium: Notification.MEDIUM.Push
      }).save())
      .then(notification => notification.load(relations))
      .then(notification => notification.send())
      .then(() => PushNotification.where({device_id: device.id}).fetchAll())
      .then(pns => {
        expect(pns.length).to.equal(1)
        var pn = pns.first()
        expect(pn.get('alert')).to.equal('Joe approved your request to join My Community')
      })
    })

    it('sends an email for a mention in a post', () => {
      spyify(Email, 'sendPostMentionNotification', opts => {
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
      .then(() => unspyify(Email, 'sendPostMentionNotification'))
    })

    it('sends no email for a comment', () => {
      spyify(Email, 'sendNewCommentNotification')

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
        expect(Email.sendNewCommentNotification).not.to.have.been.called()
      })
      .finally(() => unspyify(Email, 'sendNewCommentNotification'))
    })

    it('sends no email for a mention in a comment', () => {
      spyify(Email, 'sendNewCommentNotification')

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
        expect(Email.sendNewCommentNotification).not.to.have.been.called()
      })
      .then(() => unspyify(Email, 'sendNewCommentNotification'))
    })

    it('sends an email for a joinRequest', () => {
      spyify(Email, 'sendJoinRequestNotification', opts => {
        expect(opts).to.contain({
          email: 'readersemail@hylo.com'
        })

        expect(opts.sender).to.contain({
          name: 'My Community'
        })

        expect(opts.data).to.contain({
          community_name: 'My Community',
          requester_name: 'Joe'
        })
      })

      return new Activity({
        community_id: community.id,
        meta: {reasons: ['joinRequest']},
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
        expect(Email.sendJoinRequestNotification).to.have.been.called()
      })
      .then(() => unspyify(Email, 'sendJoinRequestNotification'))
    })

    it('sends an email for an approvedJoinRequest', () => {
      spyify(Email, 'sendApprovedJoinRequestNotification', opts => {
        expect(opts).to.contain({
          email: 'readersemail@hylo.com'
        })

        expect(opts.sender).to.contain({
          name: 'My Community'
        })

        expect(opts.data).to.contain({
          community_name: 'My Community',
          approver_name: 'Joe'
        })
      })

      return new Activity({
        community_id: community.id,
        meta: {reasons: ['approvedJoinRequest']},
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
        expect(Email.sendApprovedJoinRequestNotification).to.have.been.called()
      })
      .then(() => unspyify(Email, 'sendApprovedJoinRequestNotification'))
    })
  })

  describe('#findUnsent', () => {
    it('returns the unsent', () => {
      return Promise.join(
        new Notification({
          activity_id: activity.id,
          medium: Notification.MEDIUM.Email,
          sent_at: (new Date()).toISOString(),
          created_at: new Date()
        }).save(),
        new Notification({
          activity_id: activity.id,
          medium: Notification.MEDIUM.Push,
          created_at: new Date()
        }).save(),
        new Notification({
          activity_id: activity.id,
          medium: Notification.MEDIUM.InApp,
          created_at: new Date()
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
    var args, community
    beforeEach(() => {
      spyify(Email, 'sendNewCommentNotification', x => { args = x })
      community = factories.community()
      return community.save()
    })

    afterEach(() => unspyify(Email, 'sendNewCommentNotification'))

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

  describe('.priorityReason', () => {
    it('picks higher-priority reasons', () => {
      expect(Notification.priorityReason([
        'approvedJoinRequest: yay', 'followAdd: your face', 'newPost: yes'
      ])).to.equal('newPost')
    })

    it('returns the empty string as a fallthrough', () => {
      expect(Notification.priorityReason(['wat', 'lol'])).to.equal('')
    })
  })

  describe.only('updateUserSocketRoom', () => {
    const ioServer = io.listen(3333)
    let socketClient, socketServer, notification

    before(() => {
      socketServer = ioServer.adapter(redis(process.env.REDIS_URL))
      socketServer.on('connection', s => {
        s.join(userRoom(reader.id))
      })
    })

    after(() => {
      ioServer.close()
    })

    beforeEach(done => {
      socketClient = ioClient.connect('http://localhost:3333', {
        transports: [ 'websocket' ],
        'force new connection': true
      })
      socketClient.on('connect', () => {
        notification = new Activity({
          post_id: post.id,
          meta: { reasons: [ 'mention' ] },
          reader_id: reader.id,
          actor_id: actor.id
        })
          .save()
          .then(activity => new Notification({
            activity_id: activity.id,
            medium: Notification.MEDIUM.InApp
          }).save())

        // Break it up to make notification available in each fixture,
        // and do all of this _after_ the socket is connected
        // (mixing promises and callbacks is always fun!)
        notification
          .then(() => notification.load(relations))
          .then(() => done())
      })
    })

    afterEach(() => {
      if (socketClient.connected) {
        socketClient.disconnect()
      }
    })

    it('updates socket room', done => {
      socketClient.on('newNotification', data => {
        expect(data.activity.post.id).to.equal(post.id)
        done()
      })

      notification.send()
    })
  })
})
