import ioClient from 'socket.io-client'
import io from 'socket.io'
import redis from 'socket.io-redis'
import url from 'url'

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

// Alleviate some code duplication: grab the notification for an activity and
// load its relations
const preloadNotification = (activity, medium) =>
  new Activity(activity)
    .save()
    .then(a => new Notification({
      activity_id: a.id,
      medium
    }).save())
    .then(n => n.load(relations))

describe('Notification', function () {
  let activities, activity, actor, comment, community, device, post, reader

  before(() => {
    return factories.user({avatar_url: 'http://joe.com/headshot.jpg', name: 'Joe'}).save()
      .then(u => { actor = u })
      .then(() => factories.post({name: 'My Post', user_id: actor.id, description: 'The body of the post'}).save())
      .then(p => { post = p })
      .then(() => new Comment({text: 'hi', user_id: actor.id, post_id: post.id}).save())
      .then(c => { comment = c })
      .then(() => factories.community({name: 'My Community', slug: 'my-community'}).save())
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
      .then(a => {
        activity = a
        activities = {
          approvedJoinRequest: {
            meta: {reasons: ['approvedJoinRequest']},
            reader_id: reader.id,
            actor_id: actor.id,
            community_id: community.id
          },
          newComment: {
            comment_id: comment.id,
            meta: {reasons: ['newComment']},
            reader_id: reader.id,
            actor_id: actor.id
          },
          commentMention: {
            comment_id: comment.id,
            meta: {reasons: ['commentMention']},
            reader_id: reader.id,
            actor_id: actor.id
          },
          joinRequest: {
            meta: {reasons: ['joinRequest']},
            reader_id: reader.id,
            actor_id: actor.id,
            community_id: community.id
          },
          mention: {
            post_id: post.id,
            meta: {reasons: ['mention']},
            reader_id: reader.id,
            actor_id: actor.id
          },
          newPost: {
            post_id: post.id,
            meta: {reasons: [`newPost: ${community.id}`]},
            reader_id: reader.id,
            actor_id: actor.id,
            community_id: community.id
          }
        }
      })
  })

  beforeEach(() => destroyAllPushNotifications())

  describe('.send', () => {
    beforeEach(() => mockify(OneSignal, 'notify'))
    afterEach(() => unspyify(OneSignal, 'notify'))

    it('sends a push for a new post', () => {
      return preloadNotification(activities.newPost, Notification.MEDIUM.Push)
        .then(notification => notification.send())
        .then(() => PushNotification.where({device_id: device.id}).fetchAll())
        .then(pns => {
          expect(pns.length).to.equal(1)
          var pn = pns.first()
          expect(pn.get('alert')).to.equal('Joe posted "My Post" in My Community')
        })
    })

    it('sends a push for a mention in a post', () => {
      return preloadNotification(activities.mention, Notification.MEDIUM.Push)
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
        return preloadNotification(activities.newComment, Notification.MEDIUM.Push)
          .then(notification => notification.send())
          .then(() => PushNotification.where({device_id: device.id}).fetchAll())
          .then(pns => expect(pns.length).to.equal(0))
      })
    })

    describe('to a user with push notifications for comments enabled', () => {
      beforeEach(() => reader.addSetting({comment_notifications: 'push'}, true))
      afterEach(() => reader.removeSetting('comment_notifications', true))

      it('sends a push for a comment', () => {
        return preloadNotification(activities.newComment, Notification.MEDIUM.Push)
          .then(notification => notification.send())
          .then(() => PushNotification.where({device_id: device.id}).fetchAll())
          .then(pns => {
            expect(pns.length).to.equal(1)
            var pn = pns.first()
            expect(pn.get('alert')).to.equal(`Joe: "${comment.get('text')}" (in "My Post")`)
          })
      })

      it('sends a push for a mention in a comment', () => {
        return preloadNotification(activities.commentMention, Notification.MEDIUM.Push)
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
      return preloadNotification(activities.joinRequest, Notification.MEDIUM.Push)
        .then(notification => notification.send())
        .then(() => PushNotification.where({device_id: device.id}).fetchAll())
        .then(pns => {
          expect(pns.length).to.equal(1)
          var pn = pns.first()
          expect(pn.get('alert')).to.equal('Joe asked to join My Community')
        })
    })

    it('sends a push for an approved join request', () => {
      return preloadNotification(activities.approvedJoinRequest, Notification.MEDIUM.Push)
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

      return preloadNotification(activities.mention, Notification.MEDIUM.Email)
        .then(notification => notification.send())
        .then(() => {
          expect(Email.sendPostMentionNotification).to.have.been.called()
        })
        .then(() => unspyify(Email, 'sendPostMentionNotification'))
    })

    it('sends no email for a comment', () => {
      spyify(Email, 'sendNewCommentNotification')

      return preloadNotification(activities.newComment, Notification.MEDIUM.Email)
        .then(notification => notification.send())
        .then(() => {
          expect(Email.sendNewCommentNotification).not.to.have.been.called()
        })
        .finally(() => unspyify(Email, 'sendNewCommentNotification'))
    })

    it('sends no email for a mention in a comment', () => {
      spyify(Email, 'sendNewCommentNotification')

      return preloadNotification(activities.commentMention, Notification.MEDIUM.Email)
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

      return preloadNotification(activities.joinRequest, Notification.MEDIUM.Email)
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

      return preloadNotification(activities.approvedJoinRequest, Notification.MEDIUM.Email)
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

  // The workflow here is roughly:
  //  - create a socket server (attached to Redis via the adapter)
  //  - for each test, create a fresh socket client
  //  - once the client has connected, create the activity and load its relations
  //  - within each fixture, add a socket listener for `newNotification`
  //  - make the assertion and call `done` within the socket listener
  //  - end each fixture with the call to `updateUserSocketRoom`
  //  - take down the socket server
  //  Nothing is mocked here, so may not be the most rapid tests in the world.
  describe('updateUserSocketRoom', () => {
    const ioServer = io.listen(3333)
    let notification, socketActivity, socketClient, socketServer

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
        return preloadNotification(socketActivity, Notification.MEDIUM.InApp)
          .then(n => {
            notification = n
            done()
          })
      })
    })

    afterEach(() => {
      if (socketClient.connected) {
        socketClient.disconnect()
      }
    })

    // TODO: Feels like a good place for snapshots...
    describe('new posts', () => {
      before(() => {
        socketActivity = activities.newPost
      })

      it('updates socket room with the correct action', done => {
        socketClient.on('newNotification', data => {
          expect(data.activity.action).to.equal('newPost')
          done()
        })

        notification.updateUserSocketRoom(reader.id)
      })

      it('updates socket room with the correct actor', done => {
        socketClient.on('newNotification', data => {
          const expected = {
            avatarUrl: 'http://joe.com/headshot.jpg',
            name: 'Joe',
            id: actor.id
          }
          const actual = data.activity.actor
          expect(actual).to.deep.equal(expected)
          done()
        })

        notification.updateUserSocketRoom(reader.id)
      })

      it('updates socket room with the correct post', done => {
        socketClient.on('newNotification', data => {
          const expected = {
            details: 'The body of the post',
            id: post.id,
            title: 'My Post'
          }
          const actual = data.activity.post
          expect(actual).to.deep.equal(expected)
          done()
        })

        notification.updateUserSocketRoom(reader.id)
      })

      it('updates socket room with the correct community', done => {
        socketClient.on('newNotification', data => {
          const expected = {
            id: community.id,
            name: 'My Community',
            slug: 'my-community'
          }
          const actual = data.activity.community
          expect(actual).to.deep.equal(expected)
          done()
        })

        notification.updateUserSocketRoom(reader.id)
      })
    })

    describe('post mentions', () => {
      before(() => {
        socketActivity = activities.mention
      })

      it('updates socket room with the correct action', done => {
        socketClient.on('newNotification', data => {
          expect(data.activity.action).to.equal('mention')
          done()
        })

        notification.updateUserSocketRoom(reader.id)
      })
    })

    describe('comment mentions', () => {
      before(() => {
        socketActivity = activities.commentMention
      })

      it('updates socket room with the correct action', done => {
        socketClient.on('newNotification', data => {
          expect(data.activity.action).to.equal('commentMention')
          done()
        })

        notification.updateUserSocketRoom(reader.id)
      })
    })

    describe('join requests', () => {
      before(() => {
        socketActivity = activities.joinRequest
      })

      it('updates socket room with the correct action', done => {
        socketClient.on('newNotification', data => {
          expect(data.activity.action).to.equal('joinRequest')
          done()
        })

        notification.updateUserSocketRoom(reader.id)
      })
    })

    describe('approved join requests', () => {
      before(() => {
        socketActivity = activities.approvedJoinRequest
      })

      it('updates socket room with the correct action', done => {
        socketClient.on('newNotification', data => {
          expect(data.activity.action).to.equal('approvedJoinRequest')
          done()
        })

        notification.updateUserSocketRoom(reader.id)
      })
    })

    describe('comments', () => {
      before(() => {
        socketActivity = activities.newComment
      })

      it('updates socket room with the correct action', done => {
        socketClient.on('newNotification', data => {
          expect(data.activity.action).to.equal('newComment')
          done()
        })

        notification.updateUserSocketRoom(reader.id)
      })
    })
  })
  describe('sendPushAnnouncement', () => {
    var post, notification, reader, community, activity, user, alertText, path

    before(async () => {
      reader = await factories.user().save()
      user = await factories.user().save()
      community = await factories.community().save()
      post = await factories.post({user_id: user.id}).save()
      await community.posts().attach(post)
      activity = await factories.activity({post_id: post.id, reader_id: reader.id}).save()
      notification = await factories.notification({activity_id: activity.id}).save()
      await post.load('user')
      await notification.load(['activity', 'activity.post.communities', 'activity.reader', 'activity.post.user'])
      notification.relations.activity.relations.reader.sendPushNotification = spy((inAlertText, inPath) => {
        alertText = inAlertText
        path = inPath
      })
    })

    it.only('calls sendPushNotification with the correct params', async () => {
      await notification.sendPushAnnouncement()
      expect(notification.relations.activity.relations.reader.sendPushNotification).to.have.been.called()
      expect(alertText).to.equal(PushNotification.textForAnnouncement(post))
      expect(path).to.equal(url.parse(Frontend.Route.post(post, community)).path)
    })
  })
})
