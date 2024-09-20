import factories from '../../../test/setup/factories'
import updateComment from './updateComment'

describe('updateComment', () => {
  let user, post, comment

  before(() => {
    user = factories.user()
    return user.save()
    .then(() => {
      post = factories.post({type: Post.Type.THREAD, user_id: user.id})
      return post.save()
    })
    .then(() => {
      comment = factories.comment({user_id: user.id, post_id: post.id})
      return comment.save()
    })
  })

  it('fails without ID', () => {
    return updateComment(user.id, null, {text: 'foo'})
    .then(() => {
      expect.fail('should reject')
    })
    .catch(err => {
      expect(err.message).to.equal('updateComment called with no ID')
    })
  })

  it('prevents updating non-existent comments', () => {
    const id = `${comment.id}0`
    return updateComment(user.id, id, {text: 'foo'})
    .then(() => {
      expect.fail('should reject')
    })
    .catch(err => {
      expect(err.message).to.equal('cannot find comment with ID')
    })
  })

  it('does not set edited_at field if text does not change', async () => {
    const recent = false
    updateComment(user.id, comment.id, {recent})
    .then(async () => {
      comment = await Comment.find(comment.id)
      expect(comment.edited_at).to.equal(undefined)
    })
  })

  it('sets edited_at field when text changes', async () => {
    const text = `${comment.text}, so say I!`
    updateComment(user.id, comment.id, {text})
    .then(async () => {
      comment = await Comment.find(comment.id)
      expect(comment.edited_at).not.to.equal(undefined)
    })
  })
})
