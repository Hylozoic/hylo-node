import {
  validateCommentCreateData
} from '../../../../api/models/comment/createAndPresentComment'
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
})
