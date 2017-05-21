import { validateThreadData } from './findOrCreateThread'

describe('validateThreadData', () => {
  var user, userSharingCommunity, userNotInCommunity, inCommunity

  before(function () {
    inCommunity = new Community({slug: 'foo2', name: 'Foo2'})
    user = new User({name: 'Cat', email: 'abt@b.c'})
    userSharingCommunity = new User({name: 'Meow', email: 'a@b.cd'})
    userNotInCommunity = new User({name: 'Dog', email: 'abd@b.c'})
    return Promise.join(
      inCommunity.save(),
      user.save(),
      userSharingCommunity.save(),
      userNotInCommunity.save()
    ).then(function () {
      return Promise.join(
        user.joinCommunity(inCommunity),
        userSharingCommunity.joinCommunity(inCommunity)
      )
    })
  })

  it('fails if no participantIds are provided', () => {
    const fn = () => validateThreadData(user.id, [])
    expect(fn).to.throw(/participantIds can't be empty/)
  })
  it('fails if there is a participantId for a user the creator shares no communities with', () => {
    const data = {participantIds: [userSharingCommunity.id, userNotInCommunity.id]}
    return validateThreadData(user.id, data)
    .catch(function (e) {
      expect(e.message).to.equal(`no shared communities with user ${userNotInCommunity.id}`)
    })
  })
  it('continue the promise chain if user shares community with all participants', () => {
    const data = {participantIds: [userSharingCommunity.id]}
    expect(validateThreadData(user.id, data)).to.respondTo('then')
  })
})
