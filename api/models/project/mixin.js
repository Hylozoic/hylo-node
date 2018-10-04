import { isProjectMember } from '../group/queryUtils'

export default {
  isProject () {
    return this.get('type') === Post.Type.PROJECT
  },

  members: function () {
    return this.groupMembers(q => isProjectMember(q))
  },

  addProjectMembers: async function (usersOrIds, opts) {
    return project.addGroupMembers([userId], {
      project_role_id: ProjectRole.MEMBER_ROLE_NAME,
      following: true
    })
  },

  removeProjectMembers: async function (usersOrIds, attrs, opts) {
    return project.updateGroupMembers([userId], {
      project_role_id: null,
      following: false
    }, opts)
  },

  // Add following: true?
  updateProjectMembers: async function (userIds, opts) {
    const members = await this.members().fetch()
    await this.removeGroupMembers(members, opts)
    const memberRole = await this.getOrCreateMemberProjectRole(opts)
    return Promise.map(uniq(userIds.concat(this.get('user_id'))), async id => {
      var gm = await GroupMembership.forPair(id, this, {includeInactive: true}).fetch(opts)
      if (!gm) {
        await this.addGroupMembers([id], {}, opts)
        gm = await GroupMembership.forPair(id, this).fetch(opts)
      }
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
