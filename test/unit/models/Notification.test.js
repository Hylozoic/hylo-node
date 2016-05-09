const root = require('root-path')
require(root('test/setup'))
var factories = require(root('test/setup/factories'))

describe('Notification', function () {
  var post, activity, community, reader, actor, device

  before(() => {
    return factories.user({name: 'Joe'}).save()
    .then(u => actor = u)
    .then(() => factories.post({name: 'My Post', user_id: actor.id}).save())
    .then(p => post = p)
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

  describe('.send', () => {
    it('sends a push for a New Post', () => {
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
      .then(notification => notification.load([
        'activity',
        'activity.post',
        'activity.post.user',
        'activity.post.communities',
        'activity.comment',
        'activity.comment.post',
        'activity.comment.post.communities',
        'activity.community',
        'activity.reader',
        'activity.actor'
      ]))
      .then(notification => notification.send())
      .then(() => PushNotification.where({device_token: device.get('token')}).fetchAll())
      .then(pns => {
        expect(pns).to.exist
        expect(pns.length).to.equal(1)
        var pn = pns.first()
        expect(pn.get('alert')).to.equal('Joe posted "My Post" in My Community')
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
        expect(notifications.length).to.equal(1)
        var notification = notifications.first()
        expect(notification.get('medium')).to.equal(Notification.MEDIUM.Push)
      })
    })
  })
})
