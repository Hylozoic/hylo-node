import { afterCreatingPost } from './createPost'
const rootPath = require('root-path')
const setup = require(rootPath('test/setup'))
const factories = require(rootPath('test/setup/factories'))
const { spyify, stubGetImageSize, unspyify } = require(rootPath('test/setup/helpers'))

describe('afterCreatingPost', () => {
  let post
  const videoUrl = 'https://www.youtube.com/watch?v=jsQ7yKwDPZk'

  before(() =>
    setup.clearDb()
      .then(() => Promise.props({
        requestTag: Tag.forge({ name: 'request' }).save(),
        u1: new User({ name: 'U1', email: 'a@b.c', active: true }).save(),
      }))
      .then(props => {
        post = factories.post({ user_id: props.u1.id, description: 'wow!', link_preview_id: null })
      })
  )

  beforeEach(() => {
    spyify(Queue, 'classMethod')
  })

  after(() => unspyify(Queue, 'classMethod'))

  it('works', () => {
    return Media.generateThumbnailUrl(videoUrl)
      .then(url => stubGetImageSize(url))
      .then(() => bookshelf.transaction(trx =>
        post.save({}, { transacting: trx })
          .then(() =>
            afterCreatingPost(post, {
              groups: [],
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
        expect(child.details()).to.equal('is your uncle')

        expect(Queue.classMethod).to.have.been.called
          .with('Post', 'createActivities', { postId: post.id })
      })
  })

  it('ignores duplicate group ids', () => {
    const c = factories.group()
    return c.save()
    .then(() => post.save())
    .then(() => afterCreatingPost(post, {group_ids: [c.id, c.id]}))
    .then(() => post.load('groups'))
    .then(() => expect(post.relations.groups.length).to.equal(1))
    .catch(err => {
      throw err
    })
  })
})
