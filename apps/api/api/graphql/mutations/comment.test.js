import factories from '../../../test/setup/factories'
import setup from '../../../test/setup'
import { canDeleteComment, validateCommentCreateData, createMessage } from './comment'

describe('validateCommentCreateData', () => {
  let user, post, post2

  before(function () {
    user = new User({ name: 'King Kong', email: 'a@b.c' })
    post = factories.post()
    post2 = factories.post()
    return Promise.join(
      post.save(),
      post2.save(),
      user.save()
    ).then(function () {
      return post.addFollowers([user.id])
    })
  })

  it('rejects if user cannot access the post', () => {
    const data = { text: 't', postId: post2.id }
    return validateCommentCreateData(user.id, data)
      .then(() => expect.fail('should reject'))
      .catch(e => expect(e.message).to.match(/post not found/))
  })

  it('resolves if checks pass', () => {
    const data = { text: 't', postId: post.id }
    return validateCommentCreateData(user.id, data)
      .catch(() => expect.fail('should resolve'))
  })

  it('rejects if the comment is blank', () => {
    return validateCommentCreateData(user.id, { text: '   ', postId: post.id })
      .then(() => expect.fail('should reject'))
      .catch(e => expect(e.message).to.match(/blank comment/))
  })
})

describe('canDeleteComment', () => {
  let u1, u2, u3, c, group

  before(async () => {
    await setup.clearDb()
    group = await factories.group().save()
    u1 = await factories.user().save() // creator
    u2 = await factories.user().save() // admin
    u3 = await factories.user().save() // neither
    const p = await factories.post().save()
    c = await factories.comment().save()
    await Promise.join(
      c.save({ user_id: u1.id }),
      p.comments().create(c),
      p.groups().attach(group),
      u1.joinGroup(group),
      u2.joinGroup(group, { role: GroupMembership.Role.MODERATOR }),
      u3.joinGroup(group)
    )
  })

  it('allows the creator to delete', () => {
    return canDeleteComment(u1.id, c)
      .then(canDelete => {
        expect(canDelete).to.be.true
      })
  })

  it('allows a moderator of one of the comments groups to delete', () => {
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

describe('createMessage', () => {
  let u1, u2, post

  before(async () => {
    u1 = await factories.user().save() // creator
    u2 = await factories.user().save() // moderator
    post = await factories.post({user_id: u1.id, active: true}).save()
    await post.addFollowers([u1.id, u2.id])
  })

  it('throws an error with a blocked user', async () => {
    await createMessage(u1.id, {messageThreadId: post.id, text: 'la'})
  })
})
