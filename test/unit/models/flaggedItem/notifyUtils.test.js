import setup from '../../../setup'
import factories from '../../../setup/factories'
import mockRequire from 'mock-require'
const model = factories.mock.model

describe('sendToCommunities', () => {
  var argUserIds, argText, sendToCommunities

  before(() => {
    mockRequire.stopAll()
    mockRequire('../../../../api/services/MessagingService', {
      sendMessageFromAxolotl: spy((userIds, text) => {
        argUserIds.push(userIds)
        argText.push(text)
        return 'Bob the result'
      })
    })
    sendToCommunities = mockRequire.reRequire('../../../../api/models/flaggedItem/notifyUtils').sendToCommunities
  })

  beforeEach(() => {
    argUserIds = []
    argText = []
  })

  it('sends a message from axolotl to the communtiy moderators', () => {
    const mockCommunity = (id, modIds) => ({
      load: () => Promise.resolve(),
      id,
      relations: {
        moderators: modIds.map(id => ({id}))
      }
    })
    const modIds1 = [1, 2]
    const modIds2 = [2, 3]
    const communities = [mockCommunity(1, modIds1), mockCommunity(2, modIds2)]
    const message = 'this is the message being sent to'
    const flaggedItem = model({
      category: FlaggedItem.Category.SPAM,
      getMessageText: c => Promise.resolve(`${message} ${c.id}`)
    })

    return sendToCommunities(flaggedItem, communities)
    .then(result => {
      expect(argUserIds).to.deep.equal([modIds1, modIds2])
      expect(argText).to.deep.equal([`${message} 1`, `${message} 2`])
    })
  })

  it('it sends illegal content to HYLO ADMINS as well', () => {
    const mockCommunity = (id, modIds) => ({
      load: () => Promise.resolve(),
      id,
      relations: {
        moderators: modIds.map(id => ({id}))
      }
    })
    const modIds1 = [1, 2]
    const modIds2 = [2, 3]
    const communities = [mockCommunity(1, modIds1), mockCommunity(2, modIds2)]
    const message = 'this is the message being sent to'
    const flaggedItem = model({
      category: FlaggedItem.Category.ILLEGAL,
      getMessageText: c => Promise.resolve(`${message} ${c.id}`)
    })

    const hyloAdminIds = process.env.HYLO_ADMINS.split(',').map(id => Number(id))

    return sendToCommunities(flaggedItem, communities)
    .then(result => {
      expect(argUserIds).to.deep.equal([modIds1, modIds2, hyloAdminIds])
      expect(argText).to.deep.equal([`${message} 1`, `${message} 2`, `${message} 1`])
    })
  })
})

// for these it would be less redundant to just mock sendToCommunities and test
// that it was called with the right args. However, you can't do that with mock-require
// because it is in the same file as the functions we're testing

describe('notifyModeratorsPost', () => {
  var argUserIds, argText, notifyModeratorsPost,
    flaggedItem, modIds1, modIds2

  before(() => {
    argUserIds = []
    argText = []
    mockRequire.stopAll()
    mockRequire('../../../../api/services/MessagingService', {
      sendMessageFromAxolotl: spy((userIds, text) => {
        argUserIds.push(userIds)
        argText.push(text)
        return 'Bob the result'
      })
    })
    notifyModeratorsPost =
      mockRequire.reRequire('../../../../api/models/flaggedItem/notifyUtils').notifyModeratorsPost

    modIds1 = [1, 2]
    modIds2 = [2, 3]
    flaggedItem = model({
      getObject: () => {},
      getMessageText: c => `the message ${c.id}`,
      relations: {
        user: model({
          communitiesSharedWithPost: () => [
            model({
              id: 1,
              relations: {
                moderators: modIds1.map(id => ({id}))
              }
            }),
            model({
              id: 2,
              relations: {
                moderators: modIds2.map(id => ({id}))
              }
            })
          ]
        })
      }
    })
  })

  it('calls sendMessageFromAxolotl with the modIds', () => {
    return notifyModeratorsPost(flaggedItem)
    .then(result => {
      expect(argUserIds).to.deep.equal([modIds1, modIds2])
      expect(argText).to.deep.equal([
        'the message 1',
        'the message 2'
      ])
    })
  })
})

describe('notifyModeratorsComment', () => {
  var argUserIds, argText, notifyModeratorsComment,
    flaggedItem, modIds1, modIds2

  before(() => {
    argUserIds = []
    argText = []
    mockRequire.stopAll()
    mockRequire('../../../../api/services/MessagingService', {
      sendMessageFromAxolotl: spy((userIds, text) => {
        argUserIds.push(userIds)
        argText.push(text)
        return 'Bob the result'
      })
    })
    notifyModeratorsComment =
      mockRequire.reRequire('../../../../api/models/flaggedItem/notifyUtils').notifyModeratorsComment

    modIds1 = [1, 2]
    modIds2 = [2, 3]
    flaggedItem = model({
      getObject: () => ({relations: {}}),
      getMessageText: c => `the message ${c.id}`,
      relations: {
        user: model({
          communitiesSharedWithPost: () => [
            model({
              id: 1,
              relations: {
                moderators: modIds1.map(id => ({id}))
              }
            }),
            model({
              id: 2,
              relations: {
                moderators: modIds2.map(id => ({id}))
              }
            })
          ]
        })
      }
    })
  })

  it('calls sendMessageFromAxolotl with the modIds', () => {
    return notifyModeratorsComment(flaggedItem)
    .then(result => {
      expect(argUserIds).to.deep.equal([modIds1, modIds2])
      expect(argText).to.deep.equal([
        'the message 1',
        'the message 2'
      ])
    })
  })
})

describe('notifyModeratorsMember', () => {
  var argUserIds, argText, notifyModeratorsMember,
    flaggedItem, modIds1, modIds2

  before(() => {
    argUserIds = []
    argText = []
    mockRequire.stopAll()
    mockRequire('../../../../api/services/MessagingService', {
      sendMessageFromAxolotl: spy((userIds, text) => {
        argUserIds.push(userIds)
        argText.push(text)
        return 'Bob the result'
      })
    })
    notifyModeratorsMember =
      mockRequire.reRequire('../../../../api/models/flaggedItem/notifyUtils').notifyModeratorsMember

    modIds1 = [1, 2]
    modIds2 = [2, 3]
    flaggedItem = model({
      getObject: () => ({relations: {}}),
      getMessageText: c => `the message ${c.id}`,
      relations: {
        user: model({
          communitiesSharedWithUser: () => [
            model({
              id: 1,
              relations: {
                moderators: modIds1.map(id => ({id}))
              }
            }),
            model({
              id: 2,
              relations: {
                moderators: modIds2.map(id => ({id}))
              }
            })
          ]
        })
      }
    })
  })

  it('calls sendMessageFromAxolotl with the modIds', () => {
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
