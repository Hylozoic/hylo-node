import createAndPresentComment, {
  validateCommentCreateData,
  pushMessageToSockets
} from '../../../../api/models/comment/createAndPresentComment'
import {
  createThread
} from '../../../../api/models/post/findOrCreateThread'
import setup from '../../../setup'
import factories from '../../../setup/factories'

describe('comment/createAndPresentComment', () => {
  before(() => setup.clearDb())

  describe('validateCommentCreateData', () => {
    var user, post, post2

    before(function () {
      user = new User({name: 'King Kong', email: 'a@b.c'})
      post = factories.post()
      post2 = factories.post()
      return Promise.join(
        post.save(),
        post2.save(),
        user.save()
      ).then(function () {
        return post.addFollowers([user.id], user.id)
      })
    })

    it('fails if user cannot access the post', () => {
      const data = {text: 't', postId: post2.id}
      return validateCommentCreateData(user.id, data)
      .catch(function (e) {
        expect(e.message).to.match(/post not found/)
      })
    })
    it('continue the promise chain if checks pass', () => {
      const data = {text: 't', postId: post.id}
      expect(validateCommentCreateData(user.id, data)).to.respondTo('then')
    })
  })

  describe('pushMessageToSockets', () => {
    var user, user2, thread

    before(function () {
      user = new User({name: 'Oo Joy', email: 'oojoy@b.c'})
      user2 = new User({name: 'Oo Boy', email: 'ooboy@c.d'})
      return Promise.join(
        user.save(),
        user2.save()
      ).then(() => {
        return createThread(user.id, [user2.id])
        .then(t => {
          thread = t
        })
      })
    })

    it('sends newThread event if first message', () => {
      const message = {
        user_id: user.id
      }
      return pushMessageToSockets(thread, message, [user.id, user2.id])
      .then(promises => {
        expect(promises.length).to.equal(1)
        const { room, messageType, payload } = promises[0]
        expect(room).to.equal(`users/${user2.id}`)
        expect(messageType).to.equal('newThread')
        expect(payload.id).to.equal(thread.id)
      })
    })

    it('sends messageAdded event if not first message', () => {
      const message = {
        user_id: user.id
      }
      thread.set({num_comments: 2})
      return pushMessageToSockets(thread, message, [user.id, user2.id])
      .then(promises => {
        expect(promises.length).to.equal(1)
        const { room, messageType, payload } = promises[0]
        expect(room).to.equal(`users/${user2.id}`)
        expect(messageType).to.equal('messageAdded')
        expect(payload.postId).to.equal(thread.id)
        expect(payload.message).to.exist
      })
    })
  })


})
