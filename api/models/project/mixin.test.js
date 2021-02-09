import root from 'root-path'
const setup = require(root('test/setup'))
const factories = require(root('test/setup/factories'))

describe('Project Mixin', () => {
  describe('addProjectMembers', () => {
    var project, user
    before(async function () {
      user = factories.user()
      await user.save()
      project = factories.post({type: Post.Type.PROJECT})
      await project.save()
    })

    it('removes a user from a project', async () => {
      await project.addProjectMembers([user.id])
      const members = await project.members().fetch()
      expect(members.length).to.equal(1)
      expect(members.first().id).to.equal(user.id)
    })
  })

  describe('removeProjectMembers', () => {
    var user, project

    before(async function () {
      user = factories.user()
      await user.save()
      project = factories.post({type: Post.Type.PROJECT})
      await project.save()
      await project.addProjectMembers([user.id])
    })

    it('removes a user from a project', async () => {
      await project.removeProjectMembers([user.id])
      const members = await project.members().fetch()
      expect(members.length).to.equal(0)
    })
  })

  describe('setProjectMembers', () => {
    var user1, user2, user3, project

    before(async function () {
      user1 = factories.user()
      await user1.save()
      user2 = factories.user()
      await user2.save()
      user3 = factories.user()
      await user3.save()
      project = factories.post({type: Post.Type.PROJECT})
      await project.save()
      await project.addProjectMembers([user1.id, user2.id])
    })

    it('sets the members of a project', async () => {
      await project.setProjectMembers([user2.id, user3.id])
      const members = await project.members().fetch()
      expect(members.length).to.equal(2)
      expect(members.map('id').sort()).to.deep.equal([user2.id, user3.id].sort())
    })
  })
})