import factories from '../../setup/factories'

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
      await group.addMembers([u1.id, u2.id], {role: 1, settings: {there: true}})

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
})
