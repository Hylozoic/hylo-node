import factories from '../../../test/setup/factories'
import { canDeleteComment, validateCommentCreateData } from './comment'

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

describe('canDeleteComment', () => {
  var u1, u2, u3, c, community

  before(async () => {
    community = await factories.community().save()
    await community.createGroup()
    u1 = await factories.user().save() // creator
    u2 = await factories.user().save() // moderator
    u3 = await factories.user().save() // neither
    const p = await factories.post().save()
    c = await factories.comment().save()
    await Promise.join(
      c.save({user_id: u1.id}),
      p.comments().create(c),
      p.communities().attach(community),
      u1.joinCommunity(community),
      u2.joinCommunity(community),
      u3.joinCommunity(community)
    )
    return GroupMembership.setModeratorRole(u2.id, community)
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
