import { times } from 'lodash'
import {
  validatePostCreateData,
  validateThreadData,
  afterCreatingPost,
  afterUpdatingPost,
  updateChildren
} from '../../../../api/models/post/util'
import setup from '../../../setup'
import factories from '../../../setup/factories'
import { spyify, stubGetImageSize, unspyify } from '../../../setup/helpers'

describe('post/util', () => {
  before(() => setup.clearDb().then(() => Tag.forge({name: 'request'}).save()))

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
    it('continue the promise chain if name is provided and user is member of communities', () => {
      const data = {name: 't', community_ids: [inCommunity.id]}
      expect(validatePostCreateData(user.id, data)).to.respondTo('then')
    })
    it('continue the promise chain if valid type is provided', () => {
      const data = {name: 't', type: 'request', community_ids: [inCommunity.id]}
      expect(validatePostCreateData(user.id, data)).to.respondTo('then')
    })
  })

  describe('validateThreadData', () => {
    var user, userSharingCommunity, userNotInCommunity, inCommunity

    before(function () {
      inCommunity = new Community({slug: 'foo2', name: 'Foo2'})
      user = new User({name: 'Cat', email: 'abt@b.c'})
      userSharingCommunity = new User({name: 'Meow', email: 'a@b.cd'})
      userNotInCommunity = new User({name: 'Dog', email: 'abd@b.c'})
      return Promise.join(
        inCommunity.save(),
        user.save(),
        userSharingCommunity.save(),
        userNotInCommunity.save()
      ).then(function () {
        return Promise.join(
          user.joinCommunity(inCommunity),
          userSharingCommunity.joinCommunity(inCommunity)
        )
      })
    })

    it('fails if no participantIds are provided', () => {
      const fn = () => validateThreadData(user.id, [])
      expect(fn).to.throw(/participantIds can't be empty/)
    })
    it('fails if there is a participantId for a user the creator shares no communities with', () => {
      const data = {participantIds: [userSharingCommunity.id, userNotInCommunity.id]}
      return validateThreadData(user.id, data)
      .catch(function (e) {
        expect(e.message).to.equal(`no shared communities with user ${userNotInCommunity.id}`)
      })
    })
    it('continue the promise chain if user shares community with all participants', () => {
      const data = {participantIds: [userSharingCommunity.id]}
      expect(validateThreadData(user.id, data)).to.respondTo('then')
    })
  })

  describe('updateChildren', () => {
    var post, children

    before(() => {
      post = factories.post()
      children = times(3, () => factories.post())
      return post.save()
      .then(() => Promise.all(children.map(c =>
        c.save({parent_post_id: post.id}))))
    })

    it('creates, updates, and removes child posts', () => {
      const childrenParam = [
        { // ignore
          id: 'new-foo',
          name: ''
        },
        { // create
          id: 'new-bar',
          name: 'Yay!'
        },
        { // update
          id: children[0].id,
          name: 'Another!'
        },
        { // remove
          id: children[1].id,
          name: ''
        }
        // remove children[2] by omission
      ]

      return updateChildren(post, childrenParam)
      .then(() => post.load('children'))
      .then(() => {
        const updated = post.relations.children
        expect(updated.length).to.equal(2)
        expect(updated.find(c => c.id !== children[0].id).get('name')).to.equal('Yay!')
        expect(updated.find(c => c.id === children[0].id).get('name')).to.equal('Another!')
      })
    })
  })

  describe('afterCreatingPost', () => {
    var post
    const videoUrl = 'https://www.youtube.com/watch?v=jsQ7yKwDPZk'

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

  describe('afterUpdatingPost', () => {
    var u1, u2, post

    before(() => {
      u1 = factories.user()
      u2 = factories.user()
      post = factories.post()
      return Promise.join(u1.save(), u2.save())
      .then(() => post.save())
      .then(() => post.addFollowers([u1.id]))
    })

    it('adds new followers if there are new mentions', () => {
      const description = `hello <a data-user-id="${u2.id}">person</a>`
      return post.save({description}, {patch: true})
      .then(() => afterUpdatingPost(post, {params: {}}))
      .then(() => post.load('followers'))
      .then(() => {
        expect(post.relations.followers.pluck('id').sort())
        .to.deep.equal([u1.id, u2.id].sort())
      })
    })
  })
})
