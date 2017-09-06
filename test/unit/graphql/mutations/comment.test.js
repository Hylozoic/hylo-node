import root from 'root-path'
require(root('test/setup'))
const factories = require(root('test/setup/factories'))
import {
  canDeleteComment
} from '../../../../api/graphql/mutations/comment'

describe('canDeleteComment', () => {
  var u1, u2, u3, c, community
  before(() => {
    community = factories.community()
    u1 = factories.user() // creator
    u2 = factories.user() // moderator
    u3 = factories.user() // neither
    const p = factories.post()
    c = factories.comment()
    return Promise.join(
      community.save(), u1.save(), u2.save(), u3.save(), p.save(), c.save())
    .then(() => Promise.join(
      c.save({user_id: u1.id}),
      p.comments().create(c),
      p.communities().attach(community),
      u1.joinCommunity(community),
      u2.joinCommunity(community),
      u3.joinCommunity(community)
    ))
    .then(() => Membership.setModeratorRole(u2.id, community.id))
  })

  it('allows the creator to delete', () => {
    return canDeleteComment(u1.id, c)
    .then(canDelete => {
      expect(canDelete).to.be.true
    })
  })

  it('allows a moderator of one of the comments communities to delete', () => {
    return canDeleteComment(u2.id, c)
    .then(canDelete => {
      expect(canDelete).to.be.true
    })
  })

  it('does not allow anyone else to delete', () => {
    return canDeleteComment(u3.id, c)
    .then(canDelete => {
      expect(canDelete).to.be.false
    })
  })
})
