import '../../../test/setup'
import factories from '../../../test/setup/factories'
import { recordClickthrough, clearModerationAction, createModerationAction } from './moderation_actions'

describe('Moderation Action', () => {
  var user, post, g1, user2, agreements, modActions

  before(async function () {
    user = await factories.user().save()
    user2 = factories.user()
    post = factories.post({ type: 'discussion', user_id: user.id })
    g1 = factories.group({ active: true })
    return Promise.join(post.save(), g1.save(), user2.save())
      .then(() => factories.postUser({ post_id: post.id, user_id: user.id }).save())
      .then(() => user.joinGroup(g1))
      .then(() => user2.joinGroup(g1))
      .then(() => post.groups().attach(g1.id))
      .then(() => g1.update({ agreements: [{ title: 'Yay', description: 'I agree to be rad', order: 1 }] }, user.id))
      .then(async () => {
        agreements = await g1.agreements().fetch()
      })
  })

  it('rejects createModeractionAction if no agreements or platform agreements are specified', () => {
    return createModerationAction({ userId: user.id, data: { postId: post.id, text: 'Mean things were said', anonymous: false, agreements: [], platformAgreements: [], groupId: g1.id } })
      .then(() => expect.fail('should reject'))
      .catch(e => expect(e).to.match(/No agreements or platform agreements provided; you need to report against at least one of these/))
  })

  it('add a moderationAction on a post', () => {
    return createModerationAction({ userId: user.id, data: { postId: post.id, text: 'Mean things were said', groupId: g1.id, anonymous: false, agreements: [agreements.models[0].id], platformAgreements: [] } })
      .then(() => post.moderationActions().fetch())
      .then(async moderationActions => {
        modActions = moderationActions
        expect(moderationActions.length).to.equal(1)
        const resultPost = await Post.find(post.id)
        expect(resultPost.flaggedGroups()).to.include(g1.id)
      })
  })

  it('rejects if user is not authorized to clear a moderation action', () => {
    return clearModerationAction({ userId: user2.id, postId: post.id, groupId: g1.id, moderationActionId: modActions.models[0].id })
      .then(() => expect.fail('should reject'))
      .catch(e => {
        return expect(e.message).to.match(/You don't have permission to moderate this post/)
      })
  })

  it('Allows reporter to clear their moderationAction on a post', () => {
    return clearModerationAction({ userId: user.id, postId: post.id, groupId: g1.id, moderationActionId: modActions.models[0].id })
      .then(() => post.moderationActions().fetch())
      .then(moderationActions => {
        expect(moderationActions.models[0].get('status')).to.equal('cleared')
        expect(moderationActions.length).to.equal(1)
      })
  })

  it('allows users to clickthrough a moderated post', async () => {
    return recordClickthrough({ userId: user.id, postId: post.id })
      .then(async () => {
        const userPost = await PostUser.find(post.id, user.id)
        expect(userPost.get('clickthrough')).to.equal(true)
      })
  })
})
