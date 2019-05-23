/* eslint-disable no-unused-expressions */
import factories from '../../../test/setup/factories'

import {
  createCommunity,
  updateCommunity,
  addModerator,
  removeModerator,
  removeMember,
  regenerateAccessCode,
  deleteCommunityTopic,
  deleteCommunity
 } from './community'

describe('moderation', () => {
  var user, community

  before(function () {
    user = factories.user()
    community = factories.community()
    return Promise.join(community.save(), user.save())
    .then(() => user.joinCommunity(community, GroupMembership.Role.MODERATOR))
  })

  describe('updateCommunity', () => {
    it('rejects if name is blank', () => {
      const data = {name: '   '}
      return updateCommunity(user.id, community.id, data)
      .then(() => expect.fail('should reject'))
      .catch(e => expect(e.message).to.match(/Name cannot be blank/))
    })

    it('rejects if user is not a moderator', () => {
      const data = {name: '   '}
      return updateCommunity('777', community.id, data)
      .then(() => expect.fail('should reject'))
      .catch(e => expect(e.message).to.match(/don't have permission/))
    })
  })

  describe('addModerator', () => {
    it('works for a non-member', async () => {
      const user2 = await factories.user().save()
      await addModerator(user.id, user2.id, community.id)
      expect(await GroupMembership.hasModeratorRole(user2, community))
    })

    it('works for an existing member', async () => {
      const user2 = await factories.user().save()
      await user2.joinCommunity(community)
      await addModerator(user.id, user2.id, community.id)
      expect(await GroupMembership.hasModeratorRole(user2, community))
    })
  })

  describe('removeModerator', () => {
    it('just removes moderator role', async () => {
      const user2 = await factories.user().save()
      await user2.joinCommunity(community, GroupMembership.Role.MODERATOR)
      await removeModerator(user.id, user2.id, community.id)
      expect(!await GroupMembership.hasModeratorRole(user2, community))

      const membership = await GroupMembership.forPair(user2, community,
      {includeInactive: true}).fetch()
      expect(membership.get('active')).to.be.true
    })

    it('also removes from community when selected', async () => {
      const user2 = await factories.user().save()
      await user2.joinCommunity(community, GroupMembership.Role.MODERATOR)
      await removeModerator(user.id, user2.id, community.id, true)
      expect(!await GroupMembership.hasModeratorRole(user2, community))

      const membership = await GroupMembership.forPair(user2, community,
      {includeInactive: true}).fetch()
      expect(membership.get('active')).to.be.false
    })

    it('throws an error if youre not a moderator', async () => {
      const nonModeratorUser = await factories.user().save()
      await nonModeratorUser.joinCommunity(community, GroupMembership.Role.DEFAULT)

      const user2 = await factories.user().save()
      await user2.joinCommunity(community, GroupMembership.Role.MODERATOR)

      return expect(removeModerator(nonModeratorUser.id, user2.id, community.id, true)).to.eventually.be.rejected
    })
  })

  describe('removeMember', () => {
    it('works', async () => {
      const user2 = await factories.user().save()
      await user2.joinCommunity(community, GroupMembership.Role.MODERATOR)
      await removeMember(user.id, user2.id, community.id)

      const membership = await GroupMembership.forPair(user2, community,
        {includeInactive: true}).fetch()
      expect(membership.get('active')).to.be.false
    })
  })

  describe('regenerateAccessCode', () => {
    it('works', async () => {
      const code = community.get('beta_access_code')
      await regenerateAccessCode(user.id, community.id)
      await community.refresh()
      expect(community.get('beta_access_code')).not.to.equal(code)
    })
  })
})

describe('createCommunity', () => {
  let user, starterCommunity, starterPost, network

  before(async () => {
    user = await factories.user().save()
    network = await factories.network().save()
    starterCommunity = await factories.community({slug: 'starter-posts'}).save()
    starterPost = await factories.post().save()
    await starterCommunity.posts().attach(starterPost.id)
    await NetworkMembership.addModerator(user.id, network.id)
  })

  it('returns the new moderator membership', async () => {
    const membership = await createCommunity(user.id, {
      name: 'Foo',
      slug: 'foo',
      description: 'Here be foo'
    })

    expect(membership).to.exist
    expect(membership.get('role')).to.equal(GroupMembership.Role.MODERATOR)
    const community = await membership.groupData().fetch()
    expect(community).to.exist
    expect(community.get('slug')).to.equal('foo')
    const post = await community.posts().fetchOne()
    expect(post).to.exist
    expect(post.get('name')).to.equal(starterPost.get('name'))
  })

  it("rejects if can't moderate network", () => {
    const data = {name: 'goose', slug: 'goose', networkId: network.id + 1}
    return createCommunity(user.id, data)
    .then(() => expect.fail('should reject'))
    .catch(e => expect(e.message).to.match(/don't have permission/))
  })

  it('creates community in network if user can moderate', () => {
    const data = {name: 'goose', slug: 'goose', networkId: network.id}
    return createCommunity(user.id, data)
    .then(membership => {
      return membership.groupData().fetch()
    })
    .then(community => {
      expect(community).to.exist
      expect(Number(community.get('network_id'))).to.equal(network.id)
    })
  })  
})

describe('deleteCommunityTopic', () => {
  var user, community

  before(function () {
    user = factories.user()
    community = factories.community()
    return Promise.join(community.save(), user.save())
    .then(() => user.joinCommunity(community, GroupMembership.Role.MODERATOR))
  })

  it('deletes the topic', async () => {
    const topic = await factories.tag().save()
    const communityTopic = await CommunityTag.create({
      community_id: community.id,
      tag_id: topic.id
    })
    await deleteCommunityTopic(user.id, communityTopic.id)
    const searched = await CommunityTag.where({id: communityTopic.id}).fetch()
    expect(searched).not.to.exist
  })
})


describe('deleteCommunity', () => {
  var user, community

  before(async () => {
    user = await factories.user().save()
    community = await factories.community().save()
    await user.joinCommunity(community, GroupMembership.Role.MODERATOR)
  })

  it('makes the community inactive', async () => {
    await deleteCommunity(user.id, community.id)

    const foundCommunity = await Community.find(community.id)
    expect(foundCommunity.get('active')).to.be.false
  })
})

