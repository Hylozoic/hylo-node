import factories from '../../setup/factories'

export function myGroupIdsSqlFragment (userId) {
  return `(select "group_data_id" from "group_memberships"
    inner join "groups"
    on "groups"."id" = "group_memberships"."group_id"
    and "group_memberships"."user_id" = '${userId}'
    and "group_memberships"."active" = true
    and "groups"."active" = true)`
}

describe('Group', () => {
  describe('addMembers', () => {
    let group, u1, u2, gm1

    beforeEach(async () => {
      group = await Group.forge({group_data_type: 0}).save()
      u1 = await factories.user().save()
      u2 = await factories.user().save()
      gm1 = await group.memberships().create({
        user_id: u1.id,
        settings: {here: true},
        group_data_type: 0
      })
    })

    it('merges new settings to existing memberships and creates new ones', async () => {
      const results = await group.addMembers([u1.id, u2.id], {role: 1, settings: {there: true}})
      expect(results.length).to.equal(2)

      await gm1.refresh()
      expect(gm1.get('settings')).to.deep.equal({here: true, there: true})
      expect(gm1.get('role')).to.equal(1)

      const gm2 = await group.memberships()
      .query(q => q.where('user_id', u2.id)).fetchOne()
      expect(gm2.get('settings')).to.deep.equal({there: true})
      expect(gm2.get('role')).to.equal(1)
    })
  })

  describe('groupData', () => {
    it('returns a related post', async () => {
      const post = await factories.post().save()
      const group = await post.createGroup()
      const post2 = await group.groupData().fetch()
      expect(post2.id).to.equal(post.id)
    })
  })

  describe('removeMembers', () => {
    it('removes child members', async () => {
      const group = await factories.group().save()
      const group = await group.createGroup()
      const user1 = await factories.user().save()
      const user2 = await factories.user().save()
      await group.addMembers([user1, user2])
      await group.removeMembers(await group.members().fetch())
      const postRemoveMembers = await group.members().fetch()
      expect(postRemoveMembers.length).to.equal(0)
    })
  })

  describe('updateMembers', () => {
    it('updates members', async () => {
      const group = await factories.group().save()
      const group = await group.createGroup()
      const user1 = await factories.user().save()
      const user2 = await factories.user().save()
      const projectRole = await ProjectRole.forge({name: 'test role'}).save()
      const role = 1
      const project_role_id = projectRole.id
      const updates = { role, project_role_id }
      await group.addMembers([user1, user2])
      await group.updateMembers([user1, user2], updates)
      const updatedMemberships = await group.memberships().fetch()
      updatedMemberships.models.forEach(membership => {
        expect(membership.get('project_role_id')).to.equal(project_role_id)
        expect(membership.get('role')).to.equal(role)
      })
    })
  })

  describe('deactivate', () => {
    it('deactivates all child members', async () => {
      const group = await factories.group().save()
      const group = await group.createGroup()
      const user1 = await factories.user().save()
      const user2 = await factories.user().save()
      await group.addMembers([user1, user2])
      await Group.deactivate(group.id, Group)
      const postDeactivationMembers = await group.members().fetch()
      expect(postDeactivationMembers.length).to.equal(0)
    })
  })

  describe('selectIdsForMember', () => {
    it('produces the expected query clause', () => {
      const query = Post.query(q => {
        q.join('groups_posts', 'posts.id', 'groups_posts.group_id')
        q.whereIn('groups_posts.group_id', Group.selectIdsForMember('42'))
      })
      expectEqualQuery(query, `select * from "posts"
        inner join "groups_posts"
        on "posts"."id" = "groups_posts"."group_id"
        where "groups_posts"."group_id" in
        ${myGroupIdsSqlFragment('42')}`)
    })
  })

})
