import root from 'root-path'
const setup = require(root('test/setup'))
const factories = require(root('test/setup/factories'))
import {
  updateGroups
} from '../../../../api/models/post/util'

describe('updateGroups', () => {
  var g1, g2, g3, g4, post
  before(() =>
    setup.clearDb()
    .then(() => {
      g1 = factories.group()
      g2 = factories.group()
      g3 = factories.group()
      post = factories.post()
      return Promise.join(
        g1.save(),
        g2.save(),
        g3.save(),
        post.save())
      .then(() => Promise.join(
        post.groups().attach(g1),
        post.groups().attach(g2)
      ))
    }))

  it('updates the post groups', async () => {
    await post.load('groups')
    return updateGroups(post, [g2.id, g3.id])
    .then(() => Promise.join(
      PostMembership.find(post.id, g1.id),
      PostMembership.find(post.id, g2.id),
      PostMembership.find(post.id, g3.id),
      (pnm1, pnm2, pnm3) => {
        expect(pnm1).not.to.exist
        expect(pnm2).to.exist
        expect(pnm3).to.exist
      }
    ))
  })
})
