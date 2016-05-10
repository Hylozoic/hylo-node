const root = require('root-path')
require(root('test/setup'))
var factories = require(root('test/setup/factories'))

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
    .then(() => factories.post({name: 'My Post', user_id: actor.id}).save())
    .then(p => post = p)
    .then(() => new Comment({text: 'hi', user_id: actor.id, post_id: post.id}).save())
    .then(c => comment = c)
    .then(() => factories.community({name: 'My Community'}).save())
    .then(c => community = c)
    .then(() => community.posts().attach(post))
    .then(() => factories.user().save())
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
        expect(pn.get('alert')).to.equal('Joe commented on "My Post"')
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
        expect(pn.get('alert')).to.equal('Joe mentioned you in a comment on "My Post"')
      })
    })

    it.skip('sends an email for a mention in a post', () => {
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
    })

    it.skip('sends an email for a comment', () => {
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
    })

    it.skip('sends an email for a mention in a comment', () => {
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
        expect(notifications.length).to.equal(1)
        var notification = notifications.first()
        expect(notification.get('medium')).to.equal(Notification.MEDIUM.Push)
      })
    })
  })
})
