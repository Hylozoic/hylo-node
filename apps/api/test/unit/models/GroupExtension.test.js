/* eslint-disable no-unused-expressions */
import setup from '../../setup'
import factories from '../../setup/factories'
let starterGroup, starterPost, user, savedGroup, extension, groupExtension

describe('GroupExtension', function () {
  before(async function () {
    await setup.clearDb()
    starterGroup = await factories.group().save({ slug: 'starter-posts', access_code: 'aasdfkjh3##Sasdfsdfedss', accessibility: Group.Accessibility.OPEN })
    starterPost = await factories.post().save()
    await starterGroup.posts().attach(starterPost.id)
    const data = {
      name: 'my group',
      description: 'a group description',
      slug: 'comm1'
    }
    user = await new User({ name: 'username', email: 'john@foo.com', active: true }).save()
    await Group.create(user.id, data)
    savedGroup = await Group.find('comm1')
    const earlier = new Date(new Date().getTime() - 86400000)
    extension = await new Extension({ type: 'test', created_at: earlier }).save()
    groupExtension = await new GroupExtension({ group_id: savedGroup.id, extension_id: extension.id, active: true, data: JSON.stringify({ good: 'luck' }) }).save()
  })

  after(async function () {
    await groupExtension.destroy()
    await extension.destroy()
  })

  it('an extension can be created', function () {
    expect(extension.id).to.exist
  })

  it('a group extension relationship is also created', function () {
    expect(groupExtension.id).to.exist
  })
})
