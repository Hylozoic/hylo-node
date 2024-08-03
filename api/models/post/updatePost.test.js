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

  it('fails without ID', () => {
    try {
      return updatePost(user.id, null, {name: 'foo'})
      .then(() => {
        expect.fail('should reject')
      })
      .catch(err => {
        expect(err.message).to.equal('updatePost called with no ID')
      })
    } catch(err) {
      expect(err.message).to.equal('updatePost called with no ID')
    }
  })

  it('prevents updating non-existent posts', () => {
    const id = `${post.id}0`
    return updatePost(user.id, id, {name: 'foo'})
    .then(() => {
      expect.fail('should reject')
    })
    .catch(err => {
      expect(err.message).to.equal('Post not found')
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

  it('does not set edited_at field if name or description does not change', async () => {
    const location_id = '12345'
    updatePost(user.id, post.id, {location_id})
    .then(async () => {
      post = await Post.find(post.id)
      expect(post.get('edited_at')).to.equal(undefined)
    })
  })

  it('sets edited_at field when name changes', async () => {
    const name = `${post.name}, what ho, Bertie.`
    updatePost(user.id, post.id, {name})
    .then(async () => {
      post = await Post.find(post.id)
      expect(post.get('edited_at').getTime()).to.be.closeTo(new Date().getTime(), 2000)
    })
  })

  it('sets edited_at field when description changes', async () => {
    const description = `${post.description}, I say, Jeeves!`
    updatePost(user.id, post.id, {description})
    .then(async () => {
      post = await Post.find(post.id)
      expect(post.get('edited_at').getTime()).to.be.closeTo(new Date().getTime(), 2000)
    })
  })
})

describe('afterUpdatingPost', () => {
  let u1, u2, post

  before(() => {
    u1 = factories.user()
    u2 = factories.user()
    post = factories.post()
    return setup.clearDb()
      .then(() => Tag.findOrCreate('request'))
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
