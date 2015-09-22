const root = require('root-path')
const Changes = require(root('lib/community/changes'))
const moment = require('moment-timezone')
require(root('test/setup'))

var now = () => moment.tz('America/Los_Angeles')

var createPost = (opts) =>
  new Post(_.extend({
    name: 'foo',
    active: true,
    type: 'chat',
    created_at: now(),
    visibility: Post.Visibility.DEFAULT
  }, opts)).save()

var startTime = now().subtract(1, 'minute')
var endTime = now().add(1, 'minute')

describe('Changes', () => {
  var community

  before(() => {
    community = new Community({name: 'foo', slug: 'foo'})
    return community.save()
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
      return createPost({created_at: now().subtract(2, 'minute')})
    })

    it('returns nothing', () =>
      Changes.changedCommunities(startTime, endTime)
      .then(ids => expect(ids).to.be.empty))
  })

  describe('with a new comment', () => {
    var comment

    before(() =>
      createPost({
        created_at: now().subtract(1, 'week')
      }).tap(p => community.posts().attach(p.id))
      .then(post => {
        comment = new Comment({
          post_id: post.id,
          comment_text: 'foo',
          active: true,
          created_at: now()
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
        created_at: now()
      }).save().then(u => community.users().attach(u.id)))

    it('returns the community id', () =>
      Changes.changedCommunities(startTime, endTime)
      .then(ids => expect(ids).to.contain(community.id)))
  })
})
