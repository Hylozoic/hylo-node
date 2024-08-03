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

let starterGroup, starterPost

before(async () => {
  starterGroup = await factories.group().save({ slug: 'starter-posts', access_code: 'aasdfkjh3##Sasdfsdfedss', accessibility: Group.Accessibility.OPEN })
  starterPost = await factories.post().save()
  await starterGroup.posts().attach(starterPost.id)
})

describe('mutations/group', () => {
  describe('moderation', () => {
    let user, group

    before(function () {
      user = factories.user()
      group = factories.group()
      return Promise.join(group.save(), user.save())
        .then(() => user.joinGroup(group, { role: GroupMembership.Role.MODERATOR }))
    })

    describe('updateGroup', () => {
      it('rejects if name is blank', () => {
        const data = { name: '   ' }
        return updateGroup(user.id, group.id, data)
          .then(() => expect.fail('should reject'))
          .catch(e => expect(e.message).to.match(/Name cannot be blank/))
      })

      it('rejects if user is not a steward', () => {
        const data = { name: 'whee' }
        return updateGroup('777', group.id, data)
          .then(() => expect.fail('should reject'))
          .catch(e => expect(e.message).to.match(/You don't have the right responsibilities for this group/))
      })
    })

    describe('addModerator', () => {
      it('works for a non-member', async () => {
        const user2 = await factories.user().save()
        await addModerator(user.id, user2.id, group.id)
        expect(await GroupMembership.hasResponsibility(user2, group, Responsibility.constants.RESP_ADMINISTRATION))
      })

      it('works for an existing member', async () => {
        const user2 = await factories.user().save()
        await user2.joinGroup(group)
        await addModerator(user.id, user2.id, group.id)
        expect(await GroupMembership.hasResponsibility(user2, group, Responsibility.constants.RESP_ADMINISTRATION))
      })
    })

    // TODO: remove?
    describe('removeModerator', () => {
      it('just removes moderator role', async () => {
        const user2 = await factories.user().save()
        await user2.joinGroup(group, { role: GroupMembership.Role.MODERATOR })
        await removeModerator(user.id, user2.id, group.id)
        expect(!await GroupMembership.hasResponsibility(user2, group, Responsibility.constants.RESP_ADMINISTRATION))

        const membership = await GroupMembership.forPair(user2, group,
        {includeInactive: true}).fetch()
        expect(membership.get('active')).to.be.true
      })

      it('also removes from group when selected', async () => {
        const user2 = await factories.user().save()
        await user2.joinGroup(group, { role: GroupMembership.Role.MODERATOR })
        await removeModerator(user.id, user2.id, group.id, true)
        expect(!await GroupMembership.hasResponsibility(user2, group, Responsibility.constants.RESP_ADMINISTRATION))

        const membership = await GroupMembership.forPair(user2, group,
        {includeInactive: true}).fetch()
        expect(membership.get('active')).to.be.false
      })

      it('throws an error if youre not an administrator', async () => {
        const nonModeratorUser = await factories.user().save()
        await nonModeratorUser.joinGroup(group, { role: GroupMembership.Role.DEFAULT })

        const user2 = await factories.user().save()
        await user2.joinGroup(group, { role: GroupMembership.Role.MODERATOR })

        return expect(removeModerator(nonModeratorUser.id, user2.id, group.id, true)).to.eventually.be.rejected
      })
    })

    describe('removeMember', () => {
      it('works', async () => {
        const user2 = await factories.user().save()
        await user2.joinGroup(group, { role: GroupMembership.Role.MODERATOR })
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
    let user

    before(async () => {
      starterGroup = await factories.group().save({ slug: 'starter-posts', access_code: 'aasdfkjh3##Sasdfsdfedss', accessibility: Group.Accessibility.OPEN })
      starterPost = await factories.post().save()
      await starterGroup.posts().attach(starterPost.id)
      user = await factories.user().save()
      starterGroup.addMembers([user])
    })

    it('setups up the new administrator membership correctly', async () => {
      const group = await createGroup(user.id, {
        name: 'Foo',
        slug: 'foob',
        description: 'Here be foo'
      })

      const membership = await group.memberships().fetchOne()

      expect(group).to.exist
      expect(group.get('slug')).to.equal('foob')
      expect(membership).to.exist
      // TODO: improve this test
      expect(membership.get('role')).to.equal(GroupMembership.Role.MODERATOR)

      const post = await group.posts().fetchOne()
      expect(post).to.exist
      expect(post.get('name')).to.equal(starterPost.get('name'))

      const generalTopic = await group.tags().fetchOne()
      expect(generalTopic).to.exist
      expect(generalTopic.get('name')).to.equal('general')
      expect(generalTopic.pivot.get('is_default')).to.equal(true)

      const user2 = await membership.user().fetch()
      const generalTagFollow = await user2.tagFollows().fetchOne()
      expect(generalTagFollow).to.exist
      expect(generalTagFollow.get('tag_id')).to.equal(generalTopic.id)
    })

    it('creates inside a parent group if user can moderate the parent or parent is open', () => {
      const childGroup = { name: 'goose', slug: 'goose', parent_ids: [starterGroup.id] }
      return createGroup(user.id, childGroup)
        .then(async (group) => {
          expect(group).to.exist
          expect(Number((await group.parentGroups().fetch()).length)).to.equal(1)

          const newChildGroup = {name: 'gander', slug: 'gander', parent_ids: [group.id]}
          createGroup(user.id, newChildGroup).then(async (g2) => {
            expect(g2).to.exist
            expect(Number((await g2.parentGroups().fetch()).length)).to.equal(1)
          })
        })
    })
  })

  describe('deleteGroupTopic', () => {
    let user, group

    before(function () {
      user = factories.user()
      group = factories.group()
      return Promise.join(group.save(), user.save())
      .then(() => user.joinGroup(group, { role: GroupMembership.Role.MODERATOR }))
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
      await user.joinGroup(group, { role: GroupMembership.Role.MODERATOR })
    })

    it('makes the group inactive', async () => {
      await deleteGroup(user.id, group.id)

      const foundGroup = await Group.find(group.id)
      expect(foundGroup.get('active')).to.be.false
    })
  })
})
