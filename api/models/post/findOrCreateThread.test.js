import findOrCreateThread, { validateThreadData } from './findOrCreateThread'
import factories from '../../../test/setup/factories'

describe('findOrCreateThread', () => {
  var u1, u2, u3
  before(async () => {
    u1 = await factories.user().save()
    u2 = await factories.user().save()
    u3 = await factories.user().save()
  })

  it('finds or creates a thread', async () => {
    let thread = await findOrCreateThread(u1.id, [u1.id, u2.id, u3.id])
    thread = await Post.find(thread.id)
    expect(await thread.followers().fetch().then(x => x.length)).to.equal(3)

    let thread2 = await findOrCreateThread(u2.id, [u1.id, u2.id, u3.id])
    expect(thread2.id).to.equal(thread.id)

    let thread3 = await findOrCreateThread(u2.id, [u2.id, u3.id])
    expect(thread3.id).not.to.equal(thread.id)
    expect(await thread3.followers().fetch().then(x => x.length)).to.equal(2)
  })
})

describe('validateThreadData', () => {
  var user, userSharingGroup, userNotInGroup, group

  before(async () => {
    group = await factories.group().save()
    user = await factories.user().save()
    userSharingGroup = await factories.user().save()
    userNotInGroup = await factories.user().save()
    await user.joinGroup(group)
    await userSharingGroup.joinGroup(group)
  })

  it('fails if no participantIds are provided', () => {
    const fn = () => validateThreadData(user.id, [])
    expect(fn).to.throw(/participantIds can't be empty/)
  })
  it('fails if there is a participantId for a user the creator shares no communities with', () => {
    const data = {participantIds: [userSharingGroup.id, userNotInGroup.id]}
    return validateThreadData(user.id, data)
    .catch(function (e) {
      expect(e.message).to.equal(`no shared communities with user ${userNotInGroup.id}`)
    })
  })
  it('continue the promise chain if user shares group with all participants', () => {
    const data = {participantIds: [userSharingGroup.id]}
    expect(validateThreadData(user.id, data)).to.respondTo('then')
  })
})
