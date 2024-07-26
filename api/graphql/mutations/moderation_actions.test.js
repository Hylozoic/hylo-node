import '../../../test/setup'
import factories from '../../../test/setup/factories'
import { recordClickThrough, clearModerationAction, createModerationAction } from './moderation_actions'

describe('createModerationAction', () => {
  var user, post, g1, user2, agreements

  before(function () {
    user = factories.user()
    user2 = factories.user()
    post = factories.post({ type: 'discussion' })
    g1 = factories.group({ active: true })
    return Promise.join(user.save(), post.save(), g1.save(), user2.save())
      .then(() => user.joinGroup(g1))
      .then(() => user2.joinGroup(g1))
      .then(() => post.groups().attach(g1.id))
      .then(() => g1.update({ agreements: [{ title: 'Yay', description: 'I agree to be rad', order: 1 }] }))
      .then(async () => {
        agreements = await g1.agreements().fetch()
      })
  })

  it('rejects createModeractionAction if no agreements or platform agreements are specified', () => {
    return createModerationAction({ userId: user.id, postId: post.id, text: 'Mean things were said', anonymous: false, agreements: [], platformAgreements: [], groupId: g1.id })
      .then(() => expect.fail('should reject'))
      .catch(e => expect(e).to.match(/No agreements or platform agreements provided; you need to report against at least one of these/))
  })

  it('add a moderationAction on a post', () => {
    return createModerationAction({ userId: user.id, postId: post.id, text: 'Mean things were said', anonymous: false, agreements: [agreements[0].id], platformAgreements: [], groupId: g1.id })
      .then(() => post.moderationActions().fetch())
      .then(moderationActions => {
        expect(moderationActions.length).to.equal(1)
        expect(post.get('flagged_groups')).to.include(g1.id)
      })
  })

  it('rejects if user is not authorized to clear a moderation action', () => {
    return clearModerationAction({ userId: user2.id, postId: post.id })
      .then(() => expect.fail('should reject'))
      .catch(e => expect(e).to.match(/You don't have permission to modify this post/))
  })

  it('Allows reporter to clear their moderationAction on a post', () => {
    return clearModerationAction({ userId: user.id, postId: post.id })
      .then(() => post.moderationActions().fetch())
      .then(moderationActions => {
        expect(moderationActions[0].status).to.equal('cleared')
      })
  })

  it('allows users to clickthrough a moderated post', async () => {
    // 
  })
})
