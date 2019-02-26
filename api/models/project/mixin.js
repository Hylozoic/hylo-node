import { uniq } from 'lodash/fp'
import { isProjectMember } from '../group/queryUtils'

export default {
  isProject () {
    return this.get('type') === Post.Type.PROJECT
  },

  members: function () {
    return this.groupMembers(q => isProjectMember(q))
  },

  addProjectMembers: async function (usersOrIds, opts) {
    // need to fetchId for ProjectRole
    const projectRole =  await this.getOrCreateMemberProjectRole()
    return this.addGroupMembers(usersOrIds, {
      project_role_id: projectRole.id,
      settings: {following: true}
    }, opts)
  },

  removeProjectMembers: async function (usersOrIds, opts) {
    return this.updateGroupMembers(usersOrIds, {
      project_role_id: null,
      settings: {following: false}
    }, opts)
  },

  updateProjectMembers: async function (userIds, opts) {
    const members = await this.members().fetch()
    await this.removeGroupMembers(members, opts)
    const memberRole = await this.getOrCreateMemberProjectRole(opts)
    return Promise.map(uniq(userIds), async id => {
      var gm = await GroupMembership.forPair(id, this, {includeInactive: true}).fetch(opts)
      if (!gm) {
        await this.addGroupMembers([id], {}, opts)
        gm = await GroupMembership.forPair(id, this).fetch(opts)
      }
      gm.addSetting({following: true})
      return gm.save({
        project_role_id: memberRole.id,
        active: true
      }, opts)
    })
  },

  getOrCreateMemberProjectRole: async function (opts) {
    const memberRole = await ProjectRole.where({
      name: ProjectRole.MEMBER_ROLE_NAME,
      post_id: this.id
    }).fetch(opts)
    if (memberRole) {
      return memberRole
    } else {
      return ProjectRole.forge({
        post_id: this.id,
        name: ProjectRole.MEMBER_ROLE_NAME
      })
      .save({}, opts)
    }
  }
}
