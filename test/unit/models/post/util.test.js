import root from 'root-path'
const setup = require(root('test/setup'))
const factories = require(root('test/setup/factories'))
import {
  updateNetworkMemberships
} from '../../../../api/models/post/util'

describe('updateNetworkMemberships', () => {
  var c1, c2, n1, n2, n3, post
  before(() =>
    setup.clearDb()
    .then(() => {
      n1 = factories.network()
      n2 = factories.network()
      n3 = factories.network()
      c1 = factories.community()
      c2 = factories.community()
      post = factories.post()
      return Promise.join(
        n1.save(),
        n2.save(),
        n3.save(),
        c1.save(),
        c2.save(),
        post.save())
      .then(() => Promise.join(
        n1.communities().create(c1),
        n2.communities().create(c2),
        post.networks().attach(n2),
        post.networks().attach(n3),
        post.communities().attach(c1),
        post.communities().attach(c2)
      ))
    }))

  it('updates the network memberships', () => {
    return post.load('communities')
    .then(() => updateNetworkMemberships(post))
    .then(() => Promise.join(
      PostNetworkMembership.find(post.id, n1.id),
      PostNetworkMembership.find(post.id, n2.id),
      PostNetworkMembership.find(post.id, n3.id),
      (pnm1, pnm2, pnm3) => {
        expect(pnm1).to.exist
        expect(pnm2).to.exist
        expect(pnm3).not.to.exist
      }
    ))
  })
})
