import factories from '../../../test/setup/factories'
import { validateCommentCreateData } from './comment'

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

  it('rejects if user cannot access the post', () => {
    const data = {text: 't', postId: post2.id}
    return validateCommentCreateData(user.id, data)
    .then(() => expect.fail('should reject'))
    .catch(e => expect(e.message).to.match(/post not found/))
  })

  it('resolves if checks pass', () => {
    const data = {text: 't', postId: post.id}
    return validateCommentCreateData(user.id, data)
    .catch(() => expect.fail('should resolve'))
  })

  it('rejects if the comment is blank', () => {
    return validateCommentCreateData(user.id, {text: '   ', postId: post.id})
    .then(() => expect.fail('should reject'))
    .catch(e => expect(e.message).to.match(/blank comment/))
  })
})
