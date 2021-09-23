/* eslint-disable no-unused-expressions */
import setup from '../../setup'
import factories from '../../setup/factories'
import { expectEqualQuery, mockify, spyify, unspyify } from '../../setup/helpers'
let starterGroup, starterPost, user, group, savedGroup, extension, groupExtension

describe('GroupExtension', function() {

  before(async function() {
    await setup.clearDb()
    starterGroup = await factories.group().save({ slug: 'starter-posts', access_code: 'aasdfkjh3##Sasdfsdfedss', accessibility: Group.Accessibility.OPEN })
    starterPost = await factories.post().save()
    await starterGroup.posts().attach(starterPost.id)
    const data = {
      name: 'my group',
      description: 'a group description',
      slug: 'comm1',
      group_data_type: 1
    }
    user = await new User({name: 'username', email: 'john@foo.com', active: true}).save()
    await Group.create(user.id, data)
    savedGroup = await Group.find('comm1')
    extension = await new Extension({type: 'test'}).save()
    groupExtension = await new GroupExtension({group_id: savedGroup.id, extension_id: extension.id, active: true, data: JSON.stringify({good: 'luck'})}).save()
  });

  after(async function() {
    await groupExtension.destroy()
    await extension.destroy()
  })

  it('an extension can be created', function () {
    expect(extension.id).to.exist
  })

  it('a group extension relationship is also created', function () {
    expect(groupExtension.id).to.exist
  })

  // it('creates with default banner and avatar', async function() {
  //   const data = {
  //     'name': 'my group',
  //     'description': 'a group description',
  //     'slug': 'comm1'
  //   }

  //   const user = await new User({name: 'username', email: 'john@foo.com', active: true}).save()
  //   const group = await Group.create(user.id, data)
  //   const savedGroup = await Group.find('comm1')
  //   expect(savedGroup.get('banner_url')).to.equal('https://d3ngex8q79bk55.cloudfront.net/misc/default_community_banner.jpg')
  //   expect(savedGroup.get('avatar_url')).to.equal('https://d3ngex8q79bk55.cloudfront.net/misc/default_community_avatar.png')
  // })

  // describe('.find', function() {
  //   it('ignores a blank id', function() {
  //     return Group.find(null).then(i => expect(i).to.be.null)
  //   })
  // })

  // describe('.queryByAccessCode', function() {
  //   let group

  //   before(function() {
  //     return factories.group({active: true})
  //     .save()
  //     .then(c => { group = c })
  //   })

  //   it('finds and fetches a group by accessCode', function() {
  //     const groupId = group.get('id')
  //     const accessCode = group.get('access_code')
  //     return Group.queryByAccessCode(accessCode)
  //     .fetch()
  //     .then(c => {
  //       return expect(c.id).to.equal(groupId)
  //     })
  //   })
  // })

  // describe('.isSlugValid', function() {
  //   it('rejects invalid slugs', function() {
  //     expect(Group.isSlugValid('a b')).to.be.false
  //     expect(Group.isSlugValid('IAM')).to.be.false
  //     expect(Group.isSlugValid('wow!')).to.be.false
  //     expect(Group.isSlugValid('uh_')).to.be.false
  //     expect(Group.isSlugValid('a')).to.be.false
  //     expect(Group.isSlugValid('abcdabcdabcdabcdabcdabcdabcdabcdabcdabcdx')).to.be.false
  //   })
  // })

  // describe('.deactivate', function() {
  //   it('sets active to false and calls Group.deactivate', async function() {
  //     const group = await factories.group({ active: true }).save()
  //     await Group.deactivate(group.id)
  //     await group.refresh()
  //     expect(group.get('active')).to.equal(false)
  //   })

  //   it('deactivates all child members', async function() {
  //     const group = await factories.group().save()
  //     const user1 = await factories.user().save()
  //     const user2 = await factories.user().save()
  //     await group.addMembers([user1, user2])
  //     await Group.deactivate(group.id)
  //     const postDeactivationMembers = await group.members().fetch()
  //     expect(postDeactivationMembers.length).to.equal(0)
  //   })
  // })

  // describe('addMembers', function() {
  //   let group, u1, u2, gm1

  //   beforeEach(async function() {
  //     group = await Group.forge({group_data_type: 0}).save()
  //     u1 = await factories.user().save()
  //     u2 = await factories.user().save()
  //     gm1 = await group.memberships().create({
  //       user_id: u1.id,
  //       settings: {here: true},
  //       group_data_type: 0
  //     })
  //   })

  //   it('merges new settings to existing memberships and creates new ones', async function() {
  //     const results = await group.addMembers([u1.id, u2.id], {role: 1, settings: {there: true}})
  //     expect(results.length).to.equal(2)

  //     await gm1.refresh()
  //     expect(gm1.get('settings')).to.deep.equal({here: true, there: true})
  //     expect(gm1.get('role')).to.equal(1)

  //     const gm2 = await group.memberships()
  //     .query(q => q.where('user_id', u2.id)).fetchOne()
  //     expect(gm2.get('settings')).to.deep.equal({there: true})
  //     expect(gm2.get('role')).to.equal(1)
  //   })
  // })

  // describe('removeMembers', function() {
  //   it('removes child members', async function() {
  //     const group = await factories.group().save()
  //     const user1 = await factories.user().save()
  //     const user2 = await factories.user().save()
  //     await group.addMembers([user1, user2])
  //     await group.removeMembers(await group.members().fetch())
  //     const postRemoveMembers = await group.members().fetch()
  //     expect(postRemoveMembers.length).to.equal(0)
  //   })
  // })

  // describe('updateMembers', function() {
  //   it('updates members', async function() {
  //     const group = await factories.group().save()
  //     const user1 = await factories.user().save()
  //     const user2 = await factories.user().save()
  //     const projectRole = await ProjectRole.forge({name: 'test role'}).save()
  //     const role = 1
  //     const project_role_id = projectRole.id
  //     const updates = { role, project_role_id }
  //     await group.addMembers([user1, user2])
  //     await group.updateMembers([user1, user2], updates)
  //     const updatedMemberships = await group.memberships().fetch()
  //     updatedMemberships.models.forEach(membership => {
  //       expect(membership.get('project_role_id')).to.equal(project_role_id)
  //       expect(membership.get('role')).to.equal(role)
  //     })
  //   })
  // })

  // describe('selectIdsForMember', function() {
  //   it('produces the expected query clause', function() {
  //     const query = Post.query(q => {
  //       q.join('groups_posts', 'posts.id', 'groups_posts.group_id')
  //       q.whereIn('groups_posts.group_id', Group.selectIdsForMember('42'))
  //     })

  //     expectEqualQuery(query, `select * from "posts"
  //       inner join "groups_posts"
  //       on "posts"."id" = "groups_posts"."group_id"
  //       where "groups_posts"."group_id" in
  //       ${myGroupIdsSqlFragment('42')}`)
  //   })
  // })
})
