import setup from '../../../test/setup'
import factories from '../../../test/setup/factories'
import updatePost, { afterUpdatingPost } from './updatePost'

describe('updatePost', () => {
  let user, post

  before(() => {
    user = factories.user()
    return user.save()
    .then(() => {
      post = factories.post({type: Post.Type.THREAD, user_id: user.id})
      return post.save()
    })
  })

  it('prevents updating of certain post types', () => {
    return updatePost(user.id, post.id, {name: 'foo'})
    .then(() => {
      expect.fail('should reject')
    })
    .catch(err => {
      expect(err.message).to.equal("This post can't be modified")
    })
  })
})

describe('afterUpdatingPost', () => {
  var u1, u2, post

  before(() => {
    u1 = factories.user()
    u2 = factories.user()
    post = factories.post()
    return setup.clearDb()
    .then(() => Tag.forge({name: 'request'}).save())
    .then(() => Promise.join(u1.save(), u2.save()))
    .then(() => post.save())
    .then(() => post.addFollowers([u1.id]))
  })

  it('adds new followers if there are new mentions', async () => {
    const description = `hello <span class="mention" data-type="mention" data-id="${u2.id}" data-label="person">person</span>`
    await post.save({description}, {patch: true})
    await afterUpdatingPost(post, {params: {}})

    const followers = await post.followers().fetch()

    expect(followers.pluck('id').sort()).to.deep.equal([u1.id, u2.id].sort())
  })

  it('does not remove existing images if the imageUrls param is absent')
  it('removes existing images if the imageUrls param is empty')
})
