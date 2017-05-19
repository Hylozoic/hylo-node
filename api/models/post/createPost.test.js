import { afterCreatingPost, validatePostCreateData } from './createPost'
const rootPath = require('root-path')
const setup = require(rootPath('test/setup'))
const factories = require(rootPath('test/setup/factories'))
const { spyify, stubGetImageSize, unspyify } = require(rootPath('test/setup/helpers'))

describe('validatePostCreateData', () => {
  var user, inCommunity, notInCommunity

  before(function () {
    inCommunity = new Community({slug: 'foo', name: 'Foo'})
    notInCommunity = new Community({slug: 'bar', name: 'Bar'})
    user = new User({name: 'Cat', email: 'a@b.c'})
    return Promise.join(
      inCommunity.save(),
      notInCommunity.save(),
      user.save()
    ).then(function () {
      return user.joinCommunity(inCommunity)
    })
  })

  it('fails if no name is provided', () => {
    const fn = () => validatePostCreateData(null, {})
    expect(fn).to.throw(/title can't be blank/)
  })

  it('fails if invalid type is provided', () => {
    const fn = () => validatePostCreateData(null, {name: 't', type: 'tweet'})
    expect(fn).to.throw(/not a valid type/)
  })

  it('fails if no community_ids are provided', () => {
    const fn = () => validatePostCreateData(null, {name: 't'})
    expect(fn).to.throw(/no communities specified/)
  })

  it('fails if there is a community_id for a community user is not a member of', () => {
    const data = {name: 't', community_ids: [inCommunity.id, notInCommunity.id]}
    return validatePostCreateData(user.id, data)
    .catch(function (e) {
      expect(e.message).to.match(/unable to post to all those communities/)
    })
  })

  it('continues the promise chain if name is provided and user is member of communities', () => {
    const data = {name: 't', community_ids: [inCommunity.id]}
    expect(validatePostCreateData(user.id, data)).to.respondTo('then')
  })

  it('continues the promise chain if valid type is provided', () => {
    const data = {name: 't', type: 'request', community_ids: [inCommunity.id]}
    expect(validatePostCreateData(user.id, data)).to.respondTo('then')
  })
})

describe('afterCreatingPost', () => {
  var post
  const videoUrl = 'https://www.youtube.com/watch?v=jsQ7yKwDPZk'

  before(() => setup.clearDb().then(() => Tag.forge({name: 'request'}).save()))

  beforeEach(() => {
    post = factories.post({description: 'wow!'})
    spyify(Queue, 'classMethod')
  })

  after(() => unspyify(Queue, 'classMethod'))

  it('works', () => {
    return Media.generateThumbnailUrl(videoUrl)
    .then(url => stubGetImageSize(url))
    .then(() => bookshelf.transaction(trx =>
      post.save({}, {transacting: trx})
      .then(() =>
        afterCreatingPost(post, {
          communities: [],
          videoUrl,
          children: [
            {
              id: 'new-whatever',
              name: 'bob',
              description: 'is your uncle'
            }
          ],
          transacting: trx
        }))))
    .then(() => post.load(['media', 'children']))
    .then(() => {
      const video = post.relations.media.first()
      expect(video).to.exist
      expect(video.get('url')).to.equal(videoUrl)

      const child = post.relations.children.first()
      expect(child).to.exist
      expect(child.get('name')).to.equal('bob')
      expect(child.get('description')).to.equal('is your uncle')

      expect(Queue.classMethod).to.have.been.called
      .with('Post', 'createActivities', {postId: post.id})
    })
  })

  it('ignores duplicate community ids', () => {
    const c = factories.community()
    return c.save()
    .then(() => post.save())
    .then(() => afterCreatingPost(post, {community_ids: [c.id, c.id]}))
    .then(() => post.load('communities'))
    .then(() => expect(post.relations.communities.length).to.equal(1))
    .catch(err => {
      throw err
    })
  })
})
