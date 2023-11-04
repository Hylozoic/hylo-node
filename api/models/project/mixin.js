import { uniq } from 'lodash/fp'
import { isProjectMember } from '../group/queryUtils'

export default {
  isProject () {
    return this.get('type') === Post.Type.PROJECT
  },

  members: function () {
    return this.isProject() ? this.followers().query(q => q.whereRaw('project_role_id is not null')) : false
  },

  addProjectMembers: async function (usersOrIds, opts) {
    // need to fetchId for ProjectRole
    const projectRole =  await this.getOrCreateMemberProjectRole(opts)
    return this.addFollowers(usersOrIds, {
      project_role_id: projectRole.id,
      following: true
    }, opts)
  },

  removeProjectMembers: async function (usersOrIds, opts) {
    return this.updateFollowers(usersOrIds, {
      project_role_id: null,
      following: false
    }, opts)
  },

  setProjectMembers: async function (userIds, opts) {
    const members = await this.members().fetch(opts)
    await this.removeProjectMembers(members, opts)
    await this.addProjectMembers(userIds, opts)
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
