var root = require('root-path')
var setup = require(root('test/setup'))
var factories = require(root('test/setup/factories'))
var ActivityController = require(root('api/controllers/ActivityController'))

const destroyAllActivities = () => {
  return Activity.fetchAll()
  .then(activities => activities.map(activity => activity.destroy()))
}

describe('ActivityController', () => {
  var req, res, fixtures

  beforeEach(() => {
    req = factories.mock.request()
    res = factories.mock.response()
    return setup.clearDb()
      .then(() => Promise.props({
        u1: factories.user().save(),
        u2: factories.user().save(),
        c1: factories.community().save(),
        c2: factories.community().save(),
        p1: factories.post().save(),
        p2: factories.post().save(),
        p3: factories.post().save()
      })
      .then(props => fixtures = props))
      .then(() => Promise.join(
        fixtures.c1.posts().attach(fixtures.p1),
        fixtures.c2.posts().attach(fixtures.p2),
        fixtures.c1.posts().attach(fixtures.p3)
      ))
  })

  describe('#find', () => {

  })

  describe('#findForCommunity', () => {
  })

  describe('#update', () => {
    it('sets unread to false', () => {
      req.session.userId = fixtures.u1.id

      return new Activity({
        reader_id: fixtures.u1.id,
        post_id: fixtures.p1.id,
        unread: true
      }).save()
      .then(activity => {
        _.extend(req.params, {
          activityId: activity.id,
          unread: false
        })
        return ActivityController.update(req, res)
        .then(() => Activity.where({reader_id: fixtures.u1.id, post_id: fixtures.p1.id}).fetch())
        .then(activity => {
          expect(activity).to.exist
          expect(activity.get('unread')).to.equal(false)
        })
      })
    })
  })

  describe('#markAllRead', () => {
    beforeEach(() => destroyAllActivities())

    it('marks logged in users activities as read', () => {
      req.session.userId = fixtures.u1.id

      return Promise.join(
        new Activity({
          reader_id: fixtures.u1.id,
          post_id: fixtures.p1.id,
          unread: true
        }).save(),
        new Activity({
          reader_id: fixtures.u1.id,
          post_id: fixtures.p2.id,
          unread: true
        }).save(),
        new Activity({
          reader_id: fixtures.u2.id,
          post_id: fixtures.p3.id,
          unread: true
        }).save())
        .then(() => ActivityController.markAllRead(req, res))
        .then(() => Promise.join(
          Activity.where({reader_id: fixtures.u1.id, post_id: fixtures.p1.id}).fetch(),
          Activity.where({reader_id: fixtures.u1.id, post_id: fixtures.p2.id}).fetch(),
          Activity.where({reader_id: fixtures.u2.id, post_id: fixtures.p3.id}).fetch(),
          (u1p1, u1p2, u2p3) => {
            expect(u1p1).to.exist
            expect(u1p1.get('unread')).to.equal(false)
            expect(u1p2).to.exist
            expect(u1p2.get('unread')).to.equal(false)
            expect(u2p3).to.exist
            expect(u2p3.get('unread')).to.equal(true)
          }))
    })

    describe('with communityId', () => {
      it('marks logged in users activities in the correct community as read', () => {
        req.session.userId = fixtures.u1.id

        _.extend(req.params, {
          communityId: fixtures.c1.id,
          unread: false
        })

        return Promise.join(
          new Activity({
            reader_id: fixtures.u1.id,
            post_id: fixtures.p1.id,
            unread: true
          }).save(),
          new Activity({
            reader_id: fixtures.u1.id,
            post_id: fixtures.p2.id,
            unread: true
          }).save(),
          new Activity({
            reader_id: fixtures.u2.id,
            post_id: fixtures.p3.id,
            unread: true
          }).save())
          .then(() => ActivityController.markAllRead(req, res))
          .then(() => Promise.join(
            Activity.where({reader_id: fixtures.u1.id, post_id: fixtures.p1.id}).fetch(),
            Activity.where({reader_id: fixtures.u1.id, post_id: fixtures.p2.id}).fetch(),
            Activity.where({reader_id: fixtures.u2.id, post_id: fixtures.p3.id}).fetch(),
            (u1p1, u1p2, u2p3) => {
              expect(u1p1).to.exist
              expect(u1p1.get('unread')).to.equal(false)
              expect(u1p2).to.exist
              expect(u1p2.get('unread')).to.equal(true)
              expect(u2p3).to.exist
              expect(u2p3.get('unread')).to.equal(true)
            }))
      })
    })
  })
})
