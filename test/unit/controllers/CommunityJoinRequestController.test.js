var root = require('root-path')
require(root('test/setup'))
var factories = require(root('test/setup/factories'))
var Promise = require('bluebird')
var checkAndSetMembership = Promise.promisify(require(require('root-path')('api/policies/checkAndSetMembership')))
var CommunityController = require(root('api/controllers/CommunityController'))
var CommunityJoinRequestController = require(root('api/controllers/CommunityJoinRequestController'))

var i = 1
function makeName() {
  var name = 'Community' + i
  i = i + 1
  return name
}

function makeSlug(name) {
  return name.toLowerCase()
}

function makeCommunityNameAndSlug() {
  var name = makeName()
  var slug = makeSlug(name)
  return {name: name, slug: slug}
}

describe('CommunityJoinRequestController', function() {
  var req, res, moderator, community, joinRequestId, newUser, nameAndSlug

  beforeEach(() => {
    var creationRequest = factories.mock.request()
    var creationResponse = factories.mock.response()
    newUser = factories.user()
    return newUser.save()
    .then(() => {
      moderator = factories.user()
      return moderator.save()
    })
    .then(() => {
      req = factories.mock.request()
      res = factories.mock.response()

      // Create the community with the moderator/leader.
      var communityRequest = factories.mock.request()
      var communityResponse = factories.mock.response()
      communityRequest.session.userId = moderator.id
      nameAndSlug = makeCommunityNameAndSlug()
      _.extend(communityRequest.params, nameAndSlug)
      return CommunityController.create(communityRequest, communityResponse)
    })
    .then(() => {
      return Community.find(nameAndSlug.slug, {withRelated: ['users', 'memberships', 'leader']})
    })
    .then(com => {
      community = com
      req.params.communityId = community.id

      // Create the join request.
      creationRequest.session.userId = newUser.id
      creationRequest.params.communityId = community.id
      return CommunityJoinRequestController.create(creationRequest, creationResponse)
    })
    .then(() => {
      joinRequestId = creationResponse.body.id
    })
  })

  it('creates requests that can be found', () => {
    return CommunityJoinRequest.find(newUser.id, community.id)
    .then(cjr => {
      expect(cjr.community_id).to.equal(community.id)
      expect(cjr.user_id).to.equal(newUser.id)
    })
  })

  it('finds the request in the list for the moderator', () => {
    req.session.userId = moderator.id
    return CommunityJoinRequestController.findForModerator(req, res) 
    .then(() => {
      var expected = [{id: joinRequestId, user_id: newUser.id, community_id: community.id}]
      var resBody = JSON.parse(res.body)
      expect(resBody).to.deep.equal(expected)
    })
  })

  // Acceptance
  it('adds the user to the community when the moderator accepts', () => {
    // Expect that community has the moderator as its leader and moderator
    // and does not yet have newUser as a member.
    expect(community.relations.leader.id).to.equal(moderator.id)
    expect(community.relations.users.first().id).to.equal(moderator.id)
    expect(community.relations.users.first().pivot.get('role')).to.equal(Membership.MODERATOR_ROLE)

    // Have the moderator accept the join request.
    req.session.userId = moderator.id
    req.params.joinRequestId = joinRequestId
    return CommunityJoinRequestController.accept(req, res)

    // Expect that the join request is gone and the user is now
    // a member of the community.
    .then(() => CommunityJoinRequest.find(newUser.id, community.id))
    .then(cjr => expect(cjr).to.equal(null))
    .then(() => Community.find(community.id, {withRelated: ['users']}))
    .then(c => {
      var userIds = c.relations.users.models.map(u => u.id)
      expect(userIds.length).to.equal(2)
      expect(userIds[0]).to.equal(newUser.id)
      expect(userIds[1]).to.equal(moderator.id)
    })
  })

  // Rejection
  it('removes the join request without adding the user when the moderator rejects', () => {
    // Have the moderator reject the join request.
    req.session.userId = moderator.id
    req.params.joinRequestId = joinRequestId
    return CommunityJoinRequestController.reject(req, res)

    // Expect that the join request is gone and the new user is still
    // not a member of the community.
    .then(() => CommunityJoinRequest.find(newUser.id, community.id))
    .then(cjr => expect(cjr).to.equal(null))
    .then(() => Community.find(community.id, {withRelated: ['users']}))
    .then(c => {
      var userIds = c.relations.users.models.map(u => u.id)
      expect(userIds.length).to.equal(1)
      expect(userIds[0]).to.equal(moderator.id)
    })
  })
});

