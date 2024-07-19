import findOrCreateThread, { validateThreadData } from './findOrCreateThread'
import factories from '../../../test/setup/factories'

describe('findOrCreateThread', () => {
  let u1, u2, u3
  before(async () => {
    u1 = await factories.user().save()
    u2 = await factories.user().save()
    u3 = await factories.user().save()
  })

  it('finds or creates a thread', async () => {
    let thread = await findOrCreateThread(u1.id, [u1.id, u2.id, u3.id], true)
    thread = await Post.find(thread.id)
    expect(await thread.followers().fetch().then(x => x.length)).to.equal(3)

    const thread2 = await findOrCreateThread(u2.id, [u1.id, u2.id, u3.id], true)
    expect(thread2.id).to.equal(thread.id)

    const thread3 = await findOrCreateThread(u2.id, [u2.id, u3.id], true)
    expect(thread3.id).not.to.equal(thread.id)
    expect(await thread3.followers().fetch().then(x => x.length)).to.equal(2)
  })
})

describe('validateThreadData', () => {
  let user, userSharingGroup, userNotInGroup, group

  before(async () => {
    group = await factories.group().save()
    user = await factories.user().save()
    userSharingGroup = await factories.user().save()
    userNotInGroup = await factories.user().save()
    await user.joinGroup(group)
    await userSharingGroup.joinGroup(group)
  })

  it('fails if no participantIds are provided', async () => {
    let err
    try {
      await validateThreadData(user.id, [])
    } catch (error) {
      err = error
    }
    expect(err.message).to.equal("participantIds can't be empty")
  })

  it('fails if there is a participantId for a user the creator shares no groups with', async () => {
    const participantIds = [userSharingGroup.id, userNotInGroup.id]
    let err
    try {
      await validateThreadData(user.id, participantIds)
    } catch (error) {
      err = error
    }
    expect(err.message).to.equal("Cannot message a participant who doesn't share a group")
  })

  it('returns true if user shares group with all participants', async () => {
    const participantIds = [userSharingGroup.id]
    expect(await validateThreadData(user.id, participantIds)).to.equal(true)
  })
})
