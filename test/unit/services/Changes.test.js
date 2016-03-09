const root = require('root-path')
const Changes = require(root('lib/community/changes'))
const moment = require('moment-timezone')
const setup = require(root('test/setup'))

var noon = () => moment.tz('America/Los_Angeles').startOf('day').add(12, 'hours')

var createPost = (opts) =>
  new Post(_.extend({
    name: 'foo',
    active: true,
    type: 'chat',
    created_at: noon().clone().subtract(2, 'hours'),
    visibility: Post.Visibility.DEFAULT
  }, opts)).save()

var startTime = noon().clone().subtract(1, 'day')
var endTime = noon()

describe('Changes', () => {
  var community

  before(() => {
    community = new Community({name: 'foo', slug: 'foo'})
    return setup.clearDb().then(() => community.save())
  })

  describe('with a new post', () => {
    var post

    before(() =>
      createPost()
      .tap(p => community.posts().attach(p.id))
      .tap(p => post = p))

    after(() => post.save({active: false}, {patch: true}))

    it('returns the community id', () =>
      Changes.changedCommunities(startTime, endTime)
      .then(ids => expect(ids).to.contain(community.id)))
  })

  describe('with no new post', () => {
    before(() => {
      return createPost({created_at: noon().subtract(2, 'minute')})
    })

    it('returns nothing', () =>
      Changes.changedCommunities(startTime, endTime)
      .then(ids => expect(ids).to.be.empty))
  })

  describe('with a new comment', () => {
    var comment

    before(() =>
      createPost({
        created_at: noon().subtract(1, 'week')
      }).tap(p => community.posts().attach(p.id))
      .then(post => {
        comment = new Comment({
          post_id: post.id,
          text: 'foo',
          active: true,
          created_at: noon()
        })
        return comment.save()
      }))

    after(() => comment.destroy())

    it('returns the community id', () =>
      Changes.changedCommunities(startTime, endTime)
      .then(ids => expect(ids).to.contain(community.id)))
  })

  describe('with a new member', () => {
    before(() =>
      new User({
        name: 'foo',
        email: 'foo@bar.com',
        active: true,
        created_at: noon()
      }).save().then(u => community.users().attach({user_id: u.id, active: true})))

    it('returns the community id', () =>
      Changes.changedCommunities(startTime, endTime)
      .then(ids => expect(ids).to.contain(community.id)))
  })
})
