/* eslint-disable no-unused-expressions */
import { mapValues } from 'lodash'
const root = require('root-path')
const setup = require(root('test/setup'))
const factories = require(root('test/setup/factories'))

const makeGettable = obj => Object.assign({get: key => obj[key]}, obj)

function mockUser (memberships) {
  return {
    groupMembershipsForModel () {
      return {
        fetch: () => Promise.resolve({
          models: memberships.map(attrs => {
            const membership = GroupMembership.forge(attrs)
            membership.relations = mapValues(attrs.relations, makeGettable)
            return membership
          })
        })
      }
    }
  }
}

describe('Activity', function () {
  describe('.generateNotificationMedia', () => {
    it('returns an in-app notification from a mention', async () => {
      const memberships = [
        {
          settings: {},
          relations: {
            group: {group_data_id: 1}
          }
        }
      ]

      const activity = makeGettable({
        meta: {reasons: ['mention']},
        post_id: 1,
        relations: {
          post: {
            relations: {
              communities: [{id: 1}]
            }
          },
          reader: mockUser(memberships)
        }
      })

      const expected = [Notification.MEDIUM.InApp]

      const actual = await Activity.generateNotificationMedia(activity)
      expect(actual).to.deep.equal(expected)
    })

    it("doesn't return an email for a newPost", async () => {
      const memberships = [
        {
          settings: {sendEmail: true},
          relations: {
            group: {group_data_id: 1}
          }
        }
      ]

      const activity = makeGettable({
        meta: {reasons: ['newPost: 1']},
        post_id: 1,
        relations: {
          post: {
            relations: {
              communities: [{id: 1}, {id: 2}]
            }
          },
          reader: mockUser(memberships)
        }
      })

      const expected = []
      const actual = await Activity.generateNotificationMedia(activity)
      expect(actual).to.deep.equal(expected)
    })

    it('returns just a push for a newPost', async () => {
      const memberships = [
        {
          settings: {sendPushNotifications: true},
          relations: {
            group: {group_data_id: 1}
          }
        }
      ]

      const activity = makeGettable({
        meta: {reasons: ['newPost: 1']},
        post_id: 1,
        relations: {
          post: {
            relations: {
              communities: [{id: 1}, {id: 2}]
            }
          },
          reader: mockUser(memberships)
        }
      })

      const expected = [
        Notification.MEDIUM.Push
      ]

      const actual = await Activity.generateNotificationMedia(activity)
      expect(actual).to.deep.equal(expected)
    })

    it('returns a push and an email for different communities', async () => {
      const memberships = [
        {
          settings: {sendEmail: true},
          relations: {
            group: {group_data_id: 1}
          }
        },
        {
          settings: {sendPushNotifications: true},
          relations: {
            group: {group_data_id: 2}
          }
        }
      ]

      const activity = makeGettable({
        meta: {reasons: ['mention']},
        post_id: 1,
        relations: {
          post: {
            relations: {
              communities: [{id: 1}, {id: 2}]
            }
          },
          reader: mockUser(memberships)
        }
      })

      const expected = [
        Notification.MEDIUM.Email,
        Notification.MEDIUM.Push,
        Notification.MEDIUM.InApp
      ]

      const actual = await Activity.generateNotificationMedia(activity)
      expect(actual).to.deep.equal(expected)
    })
  })

  describe('#createWithNotifications', () => {
    var fixtures

    before(() =>
      setup.clearDb()
      .then(() => Promise.props({
        u1: factories.user().save(),
        u2: factories.user().save(),
        c1: factories.community().save(),
        c2: factories.community().save(),
        p1: factories.post().save(),
        p2: factories.post().save()
      }))
      .then(props => { fixtures = props })
      .then(() => Promise.join(
        fixtures.c1.posts().attach(fixtures.p1),
        fixtures.c1.posts().attach(fixtures.p2),
        fixtures.c2.posts().attach(fixtures.p2),
        fixtures.u1.joinCommunity(fixtures.c1),
        fixtures.u1.joinCommunity(fixtures.c2)
      )))

    it('creates an in-app notification from a mention', () => {
      return Activity.createWithNotifications({
        post_id: fixtures.p1.id,
        reader_id: fixtures.u1.id,
        actor_id: fixtures.u2.id,
        meta: {reasons: ['mention']}
      })
      .then(activity =>
        Notification.where({activity_id: activity.id, medium: Notification.MEDIUM.InApp})
        .fetch())
      .then(notification => {
        expect(notification).to.exist
        expect(notification.get('sent_at')).to.be.null
        expect(notification.get('user_id')).to.equal(fixtures.u1.id)
      })
    })

    it('creates a push notification when the community setting is true', async () => {
      await fixtures.c1.addGroupMembers([fixtures.u1.id], {
        settings: {sendPushNotifications: true}
      })
      const activity = await Activity.createWithNotifications({
        post_id: fixtures.p1.id,
        reader_id: fixtures.u1.id,
        actor_id: fixtures.u2.id,
        meta: {reasons: ['mention']}
      })
      const notification = await Notification.where({
        activity_id: activity.id, medium: Notification.MEDIUM.Push
      }).fetch()
      expect(notification).to.exist
      expect(notification.get('sent_at')).to.be.null
    })

    it('creates an email notification when the community setting is true', () => {
      return fixtures.c1.addGroupMembers([fixtures.u1.id], {
        settings: {sendEmail: true}
      })
      .then(() => Activity.createWithNotifications({
        post_id: fixtures.p1.id,
        reader_id: fixtures.u1.id,
        actor_id: fixtures.u2.id,
        meta: {reasons: ['mention']}
      }))
      .then(activity =>
        Notification.where({activity_id: activity.id, medium: Notification.MEDIUM.Email})
        .fetch())
      .then(notification => {
        expect(notification).to.exist
        expect(notification.get('sent_at')).to.be.null
      })
    })

    it("doesn't create a push notification when the community setting is false", () => {
      return fixtures.c1.addGroupMembers([fixtures.u1.id], {
        settings: {sendPushNotifications: false}
      })
      .then(() => Activity.createWithNotifications({
        post_id: fixtures.p1.id,
        reader_id: fixtures.u1.id,
        actor_id: fixtures.u2.id,
        meta: {reasons: ['mention']}
      }))
      .then(activity =>
        Notification.where({activity_id: activity.id, medium: Notification.MEDIUM.Push})
        .fetch())
      .then(notification => {
        expect(notification).not.to.exist
      })
    })

    it("doesn't create an email when the community setting is false", () => {
      return fixtures.c1.addGroupMembers([fixtures.u1.id], {
        settings: {sendEmail: false}
      })
      .then(() => Activity.createWithNotifications({
        post_id: fixtures.p1.id,
        reader_id: fixtures.u1.id,
        actor_id: fixtures.u2.id,
        meta: {reasons: ['mention']}
      }))
      .then(activity =>
        Notification.where({activity_id: activity.id, medium: Notification.MEDIUM.Push})
        .fetch())
      .then(notification => {
        expect(notification).not.to.exist
      })
    })

    it("doesn't create in-app or email for new posts ", () => {
      return fixtures.c1.addGroupMembers([fixtures.u1.id], {
        settings: {sendPushNotifications: true}
      })
      .then(() => Activity.createWithNotifications({
        post_id: fixtures.p1.id,
        reader_id: fixtures.u1.id,
        actor_id: fixtures.u2.id,
        meta: {reasons: [`newPost: ${fixtures.c1.id}`]}
      }))
      .then(activity =>
        Promise.join(
          Notification.where({activity_id: activity.id, medium: Notification.MEDIUM.InApp})
          .fetch(),
          Notification.where({activity_id: activity.id, medium: Notification.MEDIUM.Email})
          .fetch(),
          Notification.where({activity_id: activity.id, medium: Notification.MEDIUM.Push})
          .fetch(),
          (inApp, email, push) => {
            expect(inApp).not.to.exist
            expect(email).not.to.exist
            expect(push).to.exist
          }))
    })
  })

  describe('#forComment', function () {
    var comment
    before(function () {
      comment = new Comment({
        id: '4',
        user_id: '5',
        post_id: '6',
        text: 'foo'
      })
    })

    it('works', function () {
      var activity = Activity.forComment(comment, '7')

      expect(activity.get('comment_id')).to.equal('4')
      expect(activity.get('actor_id')).to.equal('5')
      expect(activity.get('post_id')).to.equal('6')
      expect(activity.get('action')).to.equal('comment')
    })

    it('sets action = "mention" for mentions', function () {
      comment.set('text', 'yo <a data-user-id="7">Bob</a>!')
      var activity = Activity.forComment(comment, '7')

      expect(activity.get('comment_id')).to.equal('4')
      expect(activity.get('actor_id')).to.equal('5')
      expect(activity.get('post_id')).to.equal('6')
      expect(activity.get('action')).to.equal('mention')
    })
  })
})
