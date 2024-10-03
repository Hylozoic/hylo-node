import '../../../setup'
import factories from '../../../setup/factories'
import mockRequire from 'mock-require'
const model = factories.mock.model

describe('sendToGroups', () => {
  let argUserIds,
    argText,
    sendToGroups,
    oldHyloAdmins,
    groups,
    modIds1,
    modIds2,
    g1,
    g2,
    u1,
    u2,
    u3

  before(async () => {
    mockRequire.stopAll()
    mockRequire('../../../../api/services/MessagingService', {
      sendMessageFromAxolotl: spy((userIds, text) => {
        for (const i of userIds) argUserIds.push(i)
        argText.push(text)
        return 'Bob the result'
      })
    })
    sendToGroups = mockRequire.reRequire('../../../../api/models/flaggedItem/notifyUtils').sendToGroups
    oldHyloAdmins = process.env.HYLO_ADMINS
    process.env.HYLO_ADMINS = '11,22'

    await bookshelf.transaction(async (transacting) => {
      g1 = await factories.group().save({}, { transacting })
      g2 = await factories.group().save({}, { transacting })
      u1 = await factories.user().save({}, { transacting })
      u2 = await factories.user().save({}, { transacting })
      u3 = await factories.user().save({}, { transacting })
      await g1.addMembers([u1, u2], { role: GroupMembership.Role.MODERATOR }, { transacting })
      await g2.addMembers([u2, u3], { role: GroupMembership.Role.MODERATOR }, { transacting })
    })

    groups = [g1, g2]
    modIds1 = [u1.id, u2.id]
    modIds2 = [u2.id, u3.id]
  })

  beforeEach(() => {
    argUserIds = []
    argText = []
  })

  after(() => {
    process.env.HYLO_ADMINS = oldHyloAdmins
  })

  it('sends a message from axolotl to the group stewards', () => {
    const message = 'this is the message being sent to'
    const flaggedItem = model({
      category: FlaggedItem.Category.SPAM,
      getMessageText: c => Promise.resolve(`${message} ${c.id}`)
    })

    return sendToGroups(flaggedItem, groups)
      .then(result => {
        expect(argUserIds.sort()).to.deep.equal(modIds1.concat(modIds2).sort())
        expect(argText).to.deep.equal([`${message} ${g1.id}`, `${message} ${g2.id}`])
      })
  })

  it('sends illegal content to HYLO ADMINS as well', () => {
    const message = 'this is the message being sent to'
    const flaggedItem = model({
      category: FlaggedItem.Category.ILLEGAL,
      getMessageText: c => Promise.resolve(`${message} ${c.id}`)
    })

    const expectedText = [`${message} ${g1.id}`, `${message} ${g2.id}`]

    const hyloAdminIds = process.env.HYLO_ADMINS.split(',').map(id => Number(id))
    const expectedUserIds = modIds1.concat(modIds2).concat(hyloAdminIds).sort()
    expectedText.push(`${message} ${g1.id}`)

    return sendToGroups(flaggedItem, groups)
      .then(result => {
        expect(argUserIds.sort()).to.deep.equal(expectedUserIds)
        expect(argText).to.deep.equal(expectedText)
      })
  })
})

// for these it would be less redundant to just mock sendToGroups and test
// that it was called with the right args. However, you can't do that with mock-require
// because it is in the same file as the functions we're testing

const notifyUtilsPath = '../../../../api/models/flaggedItem/notifyUtils'

describe('notifying moderators', () => {
  let argUserIds,
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

    const mockGroups = [
      model({
        id: 1,
        moderators: () => ({
          fetch: async () => modIds1.map(id => ({ id }))
        })
      }),
      model({
        id: 2,
        moderators: () => ({
          fetch: async () => modIds2.map(id => ({ id }))
        })
      })
    ]

    flaggedItem = model({
      getObject: () => ({ relations: { post: { attributes: { is_public: false } } }, attributes: { is_public: false } }),
      getMessageText: c => `the message ${c.id}`,
      relations: {
        user: model({
          groupsSharedWithPost: () => mockGroups,
          groupsSharedWithUser: () => mockGroups
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
