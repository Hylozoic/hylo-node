/* eslint-disable no-unused-expressions */
import factories from '../../../test/setup/factories'

import {
  createGroup,
  updateGroup,
  addModerator,
  removeModerator,
  removeMember,
  regenerateAccessCode,
  deleteGroupTopic,
  deleteGroup
 } from './group'

describe('moderation', () => {
  var user, group

  before(function () {
    user = factories.user()
    group = factories.group()
    return Promise.join(group.save(), user.save())
    .then(() => user.joinGroup(group, GroupMembership.Role.MODERATOR))
  })

  describe('updateGroup', () => {
    it('rejects if name is blank', () => {
      const data = {name: '   '}
      return updateGroup(user.id, group.id, data)
      .then(() => expect.fail('should reject'))
      .catch(e => expect(e.message).to.match(/Name cannot be blank/))
    })

    it('rejects if user is not a moderator', () => {
      const data = {name: '   '}
      return updateGroup('777', group.id, data)
      .then(() => expect.fail('should reject'))
      .catch(e => expect(e.message).to.match(/don't have permission/))
    })
  })

  describe('addModerator', () => {
    it('works for a non-member', async () => {
      const user2 = await factories.user().save()
      await addModerator(user.id, user2.id, group.id)
      expect(await GroupMembership.hasModeratorRole(user2, group))
    })

    it('works for an existing member', async () => {
      const user2 = await factories.user().save()
      await user2.joinGroup(group)
      await addModerator(user.id, user2.id, group.id)
      expect(await GroupMembership.hasModeratorRole(user2, group))
    })
  })

  describe('removeModerator', () => {
    it('just removes moderator role', async () => {
      const user2 = await factories.user().save()
      await user2.joinGroup(group, GroupMembership.Role.MODERATOR)
      await removeModerator(user.id, user2.id, group.id)
      expect(!await GroupMembership.hasModeratorRole(user2, group))

      const membership = await GroupMembership.forPair(user2, group,
      {includeInactive: true}).fetch()
      expect(membership.get('active')).to.be.true
    })

    it('also removes from group when selected', async () => {
      const user2 = await factories.user().save()
      await user2.joinGroup(group, GroupMembership.Role.MODERATOR)
      await removeModerator(user.id, user2.id, group.id, true)
      expect(!await GroupMembership.hasModeratorRole(user2, group))

      const membership = await GroupMembership.forPair(user2, group,
      {includeInactive: true}).fetch()
      expect(membership.get('active')).to.be.false
    })

    it('throws an error if youre not a moderator', async () => {
      const nonModeratorUser = await factories.user().save()
      await nonModeratorUser.joinGroup(group, GroupMembership.Role.DEFAULT)

      const user2 = await factories.user().save()
      await user2.joinGroup(group, GroupMembership.Role.MODERATOR)

      return expect(removeModerator(nonModeratorUser.id, user2.id, group.id, true)).to.eventually.be.rejected
    })
  })

  describe('removeMember', () => {
    it('works', async () => {
      const user2 = await factories.user().save()
      await user2.joinGroup(group, GroupMembership.Role.MODERATOR)
      await removeMember(user.id, user2.id, group.id)

      const membership = await GroupMembership.forPair(user2, group,
        {includeInactive: true}).fetch()
      expect(membership.get('active')).to.be.false
    })
  })

  describe('regenerateAccessCode', () => {
    it('works', async () => {
      const code = group.get('access_code')
      await regenerateAccessCode(user.id, group.id)
      await group.refresh()
      expect(group.get('access_code')).not.to.equal(code)
    })
  })
})

describe('createGroup', () => {
  let user, starterGroup, starterPost

  before(async () => {
    user = await factories.user().save()
    starterGroup = await factories.group({slug: 'starter-posts'}).save()
    starterPost = await factories.post().save()
    await starterGroup.posts().attach(starterPost.id)
  })

  it('returns the new moderator membership', async () => {
    const membership = await createGroup(user.id, {
      name: 'Foo',
      slug: 'foob',
      description: 'Here be foo'
    })

    expect(membership).to.exist
    expect(membership.get('role')).to.equal(GroupMembership.Role.MODERATOR)
    const group = await membership.groupData().fetch()
    expect(group).to.exist
    expect(group.get('slug')).to.equal('foob')
    const post = await group.posts().fetchOne()
    expect(post).to.exist
    expect(post.get('name')).to.equal(starterPost.get('name'))
  })

  it('creates sub-group in the group if user can moderate', () => {
    const data = {name: 'goose', slug: 'goose', parentIds: [starterGroup.id]}
    return createGroup(user.id, data)
    .then(membership => {
      return membership.groupData().fetch()
    })
    .then(group => {
      expect(group).to.exist
      expect(Number(group.childGroups().length)).to.equal(1)
    })
  })
})

describe('deleteGroupTopic', () => {
  var user, group

  before(function () {
    user = factories.user()
    group = factories.group()
    return Promise.join(group.save(), user.save())
    .then(() => user.joinGroup(group, GroupMembership.Role.MODERATOR))
  })

  it('deletes the topic', async () => {
    const topic = await factories.tag().save()
    const groupTopic = await GroupTag.create({
      group_id: group.id,
      tag_id: topic.id
    })
    await deleteGroupTopic(user.id, groupTopic.id)
    const searched = await GroupTag.where({id: groupTopic.id}).fetch()
    expect(searched).not.to.exist
  })
})


describe('deleteGroup', () => {
  var user, group

  before(async () => {
    user = await factories.user().save()
    group = await factories.group().save()
    await user.joinGroup(group, GroupMembership.Role.MODERATOR)
  })

  it('makes the group inactive', async () => {
    await deleteGroup(user.id, group.id)

    const foundGroup = await Group.find(group.id)
    expect(foundGroup.get('active')).to.be.false
  })
})

