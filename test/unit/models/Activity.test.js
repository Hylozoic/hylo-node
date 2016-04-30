const root = require('root-path')
var setup = require(root('test/setup'))
var factories = require(root('test/setup/factories'))

describe('Activity', function () {
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
      .then(props => fixtures = props)
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
        Notification.where({activity_id: activity.id, medium: Notification.MEDIA.InApp})
        .fetch())
      .then(notification => {
        expect(notification).to.exist
        expect(notification.get('sent_at')).to.be.null
      })
    })

    it('creates a push notification when the community setting is true', () => {
      return Membership.query().where({user_id: fixtures.u1.id, community_id: fixtures.c1.id})
      .update({settings: {
        send_push_notifications: true
      }})
      .then(() => Activity.createWithNotifications({
        post_id: fixtures.p1.id,
        reader_id: fixtures.u1.id,
        actor_id: fixtures.u2.id,
        meta: {reasons: ['mention']}
      }))
      .then(activity =>
        Notification.where({activity_id: activity.id, medium: Notification.MEDIA.Push})
        .fetch())
      .then(notification => {
        expect(notification).to.exist
        expect(notification.get('sent_at')).to.be.null
      })
    })

    it('creates an email notification when the community setting is true', () => {
      return Membership.query().where({user_id: fixtures.u1.id, community_id: fixtures.c1.id})
      .update({settings: {
        send_email: true
      }})
      .then(() => Activity.createWithNotifications({
        post_id: fixtures.p1.id,
        reader_id: fixtures.u1.id,
        actor_id: fixtures.u2.id,
        meta: {reasons: ['mention']}
      }))
      .then(activity =>
        Notification.where({activity_id: activity.id, medium: Notification.MEDIA.Push})
        .fetch())
      .then(notification => {
        expect(notification).to.exist
        expect(notification.get('sent_at')).to.be.null
      })
    })

    it("doesn't creates a push notification when the community setting is false", () => {
      return Membership.query().where({user_id: fixtures.u1.id, community_id: fixtures.c1.id})
      .update({settings: {
        send_push_notifications: false
      }})
      .then(() => Activity.createWithNotifications({
        post_id: fixtures.p1.id,
        reader_id: fixtures.u1.id,
        actor_id: fixtures.u2.id,
        meta: {reasons: ['mention']}
      }))
      .then(activity =>
        Notification.where({activity_id: activity.id, medium: Notification.MEDIA.Push})
        .fetch())
      .then(notification => {
        expect(notification).not.to.exist
      })
    })

    it("doesn't creates an email when the community setting is false", () => {
      return Membership.query().where({user_id: fixtures.u1.id, community_id: fixtures.c1.id})
      .update({settings: {
        send_email: false
      }})
      .then(() => Activity.createWithNotifications({
        post_id: fixtures.p1.id,
        reader_id: fixtures.u1.id,
        actor_id: fixtures.u2.id,
        meta: {reasons: ['mention']}
      }))
      .then(activity =>
        Notification.where({activity_id: activity.id, medium: Notification.MEDIA.Push})
        .fetch())
      .then(notification => {
        expect(notification).not.to.exist
      })
    })

    it("doesn't creates in-app or email for new posts ", () => {
      return Membership.query().where({user_id: fixtures.u1.id, community_id: fixtures.c1.id})
      .update({settings: {
        send_push_notifications: false
      }})
      .then(() => Activity.createWithNotifications({
        post_id: fixtures.p1.id,
        reader_id: fixtures.u1.id,
        actor_id: fixtures.u2.id,
        meta: {reasons: [`newPost: ${fixtures.c1.id}`]}
      }))
      .then(activity =>
        Promise.join(
          Notification.where({activity_id: activity.id, medium: Notification.MEDIA.InApp})
          .fetch(),
          Notification.where({activity_id: activity.id, medium: Notification.MEDIA.Email})
          .fetch(),
          Notification.where({activity_id: activity.id, medium: Notification.MEDIA.Push})
          .fetch(),
          (inApp, email, push) => {
            expect(inApp).not.to.exist
            expect(email).not.to.exist
            expect(push).to.exist
          }))
    })

    it('with multiple communities, it respects the most permissive setting', () => {

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
