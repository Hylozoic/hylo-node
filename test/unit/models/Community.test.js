/* eslint-disable no-unused-expressions */
const root = require('root-path')
require(root('test/setup'))
const factories = require(root('test/setup/factories'))
const { mockify, unspyify } = require(root('test/setup/helpers'))

describe('Group', () => {
  it('can be created', function () {
    var group = new Group({slug: 'foo', name: 'foo', beta_access_code: 'foo!'})
    return group.save().then(() => {
      expect(group.id).to.exist
    })
  })

  it('creates with default banner and avatar', async () => {
    const data = {
      'name': 'my group',
      'description': 'a group description',
      'slug': 'comm1'
    }

    const user = await new User({name: 'username', email: 'john@foo.com', active: true}).save()
    await new Group({slug: 'starter-posts', name: 'starter-posts', beta_access_code: 'aasdfkjh3##Sasdfsdfedss'}).save()

    const group = await Group.create(user.id, data)

    const savedGroup = await Group.find('comm1')
    expect(savedGroup.get('banner_url')).to.equal('https://d3ngex8q79bk55.cloudfront.net/misc/default_group_banner.jpg')
    expect(savedGroup.get('avatar_url')).to.equal('https://d3ngex8q79bk55.cloudfront.net/misc/default_group_avatar.png')
  })

  describe('.find', () => {
    it('ignores a blank id', () => {
      return Group.find(null).then(i => expect(i).to.be.null)
    })
  })

  describe('.queryByAccessCode', () => {
    let group

    before(() => {
      return factories.group({active: true})
      .save()
      .then(c => { group = c })
    })

    it('finds and fetches a group by accessCode', () => {
      const groupId = group.get('id')
      const accessCode = group.get('beta_access_code')
      return Group.queryByAccessCode(accessCode)
      .fetch()
      .then(c => {
        return expect(c.id).to.equal(groupId)
      })
    })
  })

  describe('.isSlugValid', () => {
    it('rejects invalid slugs', () => {
      expect(Group.isSlugValid('a b')).to.be.false
      expect(Group.isSlugValid('IAM')).to.be.false
      expect(Group.isSlugValid('wow!')).to.be.false
      expect(Group.isSlugValid('uh_')).to.be.false
      expect(Group.isSlugValid('a')).to.be.false
      expect(Group.isSlugValid('abcdabcdabcdabcdabcdabcdabcdabcdabcdabcdx')).to.be.false
    })
  })

  describe('.reconcileNumMembers', () => {
    let group

    before(async () => {
      group = await factories.group().save()
      await group.addMembers([
        await factories.user().save(),
        await factories.user({active: false}).save()
      ])
    })

    it('sets num_members correctly', async () => {
      await group.reconcileNumMembers()
      expect(group.get('num_members')).to.equal(1)
    })
  })

  describe('.deactivate', () => {
    before(() => {
      mockify(Group, 'deactivate')
    })

    after(() => {
      unspyify(Group, 'deactivate')
    })

    it('sets active to false and calls Group.deactivate', async () => {
      const group = await factories.group({active: true}).save()
      await Group.deactivate(group.id)
      await group.refresh()
      expect(group.get('active')).to.equal(false)
      expect(Group.deactivate).to.have.been.called.with(group.id, Group)
    })
  })
})
