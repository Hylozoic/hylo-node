import '../../../setup'
import factories from '../../../setup/factories'
import mockRequire from 'mock-require'
const model = factories.mock.model

describe('sendToCommunities', () => {
  var argUserIds,
    argText,
    sendToCommunities,
    oldHyloAdmins,
    communities,
    modIds1,
    modIds2,
    c1,
    c2

  before(() => {
    mockRequire.stopAll()
    mockRequire('../../../../api/services/MessagingService', {
      sendMessageFromAxolotl: spy((userIds, text) => {
        for (let i of userIds) argUserIds.push(i)
        argText.push(text)
        return 'Bob the result'
      })
    })
    sendToCommunities = mockRequire.reRequire('../../../../api/models/flaggedItem/notifyUtils').sendToCommunities
    oldHyloAdmins = process.env.HYLO_ADMINS
    process.env.HYLO_ADMINS = '11,22'
  })

  beforeEach(async () => {
    argUserIds = []
    argText = []

    c1 = await factories.community().save()
    c2 = await factories.community().save()
    const u1 = await factories.user().save()
    const u2 = await factories.user().save()
    const u3 = await factories.user().save()
    await c1.addGroupMembers([u1, u2], {role: GroupMembership.Role.MODERATOR})
    await c2.addGroupMembers([u2, u3], {role: GroupMembership.Role.MODERATOR})

    communities = [c1, c2]
    modIds1 = [u1.id, u2.id]
    modIds2 = [u2.id, u3.id]
  })

  after(() => {
    process.env.HYLO_ADMINS = oldHyloAdmins
  })

  it('sends a message from axolotl to the community moderators', () => {
    const message = 'this is the message being sent to'
    const flaggedItem = model({
      category: FlaggedItem.Category.SPAM,
      getMessageText: c => Promise.resolve(`${message} ${c.id}`)
    })

    return sendToCommunities(flaggedItem, communities)
    .then(result => {
      expect(argUserIds.sort()).to.deep.equal(modIds1.concat(modIds2).sort())
      expect(argText).to.deep.equal([`${message} ${c1.id}`, `${message} ${c2.id}`])
    })
  })

  it('sends illegal content to HYLO ADMINS as well', () => {
    const message = 'this is the message being sent to'
    const flaggedItem = model({
      category: FlaggedItem.Category.ILLEGAL,
      getMessageText: c => Promise.resolve(`${message} ${c.id}`)
    })

    var expectedText = [`${message} ${c1.id}`, `${message} ${c2.id}`]

    const hyloAdminIds = process.env.HYLO_ADMINS.split(',').map(id => Number(id))
    var expectedUserIds = modIds1.concat(modIds2).concat(hyloAdminIds).sort()
    expectedText.push(`${message} ${c1.id}`)

    return sendToCommunities(flaggedItem, communities)
    .then(result => {
      expect(argUserIds.sort()).to.deep.equal(expectedUserIds)
      expect(argText).to.deep.equal(expectedText)
    })
  })
})

// for these it would be less redundant to just mock sendToCommunities and test
// that it was called with the right args. However, you can't do that with mock-require
// because it is in the same file as the functions we're testing

const notifyUtilsPath = '../../../../api/models/flaggedItem/notifyUtils'

describe('notifying moderators', () => {
  var argUserIds,
    argText,
    flaggedItem,
    modIds1,
    modIds2

  before(() => {
    mockRequire.stopAll()
    mockRequire('../../../../api/services/MessagingService', {
      sendMessageFromAxolotl: spy((userIds, text) => {
        argUserIds.push(userIds)
        argText.push(text)
        return 'Bob the result'
      })
    })

    modIds1 = [1, 2]
    modIds2 = [2, 3]

    const mockCommunities = [
      model({
        id: 1,
        moderators: () => ({
          fetch: async () => modIds1.map(id => ({id}))
        })
      }),
      model({
        id: 2,
        moderators: () => ({
          fetch: async () => modIds2.map(id => ({id}))
        })
      })
    ]

    flaggedItem = model({
      getObject: () => ({relations: {}}),
      getMessageText: c => `the message ${c.id}`,
      relations: {
        user: model({
          communitiesSharedWithPost: () => mockCommunities,
          communitiesSharedWithUser: () => mockCommunities
        })
      }
    })
  })

  beforeEach(() => {
    argUserIds = []
    argText = []
  })

  it('works for a post', () => {
    const notifyModeratorsPost = mockRequire.reRequire(notifyUtilsPath).notifyModeratorsPost
    return notifyModeratorsPost(flaggedItem)
    .then(result => {
      expect(argUserIds).to.deep.equal([modIds1, modIds2])
      expect(argText).to.deep.equal([
        'the message 1',
        'the message 2'
      ])
    })
  })

  it('works for a comment', () => {
    const notifyModeratorsComment = mockRequire.reRequire(notifyUtilsPath).notifyModeratorsComment
    return notifyModeratorsComment(flaggedItem)
    .then(result => {
      expect(argUserIds).to.deep.equal([modIds1, modIds2])
      expect(argText).to.deep.equal([
        'the message 1',
        'the message 2'
      ])
    })
  })

  it('works for a member', () => {
    const notifyModeratorsMember = mockRequire.reRequire(notifyUtilsPath).notifyModeratorsMember
    return notifyModeratorsMember(flaggedItem)
    .then(result => {
      expect(argUserIds).to.deep.equal([modIds1, modIds2])
      expect(argText).to.deep.equal([
        'the message 1',
        'the message 2'
      ])
    })
  })
})
