import '../../setup'
import factories from '../../setup/factories'
import { removePost } from '../../../api/services/PostManagement'

describe('PostManagement', () => {
  describe('removePost', () => {
    var post, user

    beforeEach(() => {
      user = factories.user()
      return user.save()
      .then(() => {
        post = factories.post({user_id: user.id})
        return post.save()
      })
      .then(() => factories.comment({post_id: post.id}).save())
    })

    it('works', () => {
      return removePost(post.id)
      .then(() => Post.find(post.id))
      .then(p => expect(p).not.to.exist)
    })
  })
})
