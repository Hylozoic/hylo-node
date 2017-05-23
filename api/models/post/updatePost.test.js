import setup from '../../../test/setup'
import factories from '../../../test/setup/factories'
import { afterUpdatingPost } from './updatePost'

describe('updatePost', () => {
  before(() => setup.clearDb().then(() => Tag.forge({name: 'request'}).save()))

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
