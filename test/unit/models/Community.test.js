/* eslint-disable no-unused-expressions */
const root = require('root-path')
require(root('test/setup'))
const factories = require(root('test/setup/factories'))
const { mockify, unspyify } = require(root('test/setup/helpers'))

describe('Community', () => {
  it('can be created', function () {
    var community = new Community({slug: 'foo', name: 'foo', beta_access_code: 'foo!'})
    return community.save().then(() => {
      expect(community.id).to.exist
    })
  })

  describe('.find', () => {
    it('ignores a blank id', () => {
      return Community.find(null).then(i => expect(i).to.be.null)
    })
  })

  describe('.queryByAccessCode', () => {
    let community

    before(() => {
      return factories.community({active: true})
      .save()
      .then(c => { community = c })
    })

    it('finds and fetches a community by accessCode', () => {
      const communityId = community.get('id')
      const accessCode = community.get('beta_access_code')
      return Community.queryByAccessCode(accessCode)
      .fetch()
      .then(c => {
        return expect(c.id).to.equal(communityId)
      })
    })
  })

  describe('.isSlugValid', () => {
    it('rejects invalid slugs', () => {
      expect(Community.isSlugValid('a b')).to.be.false
      expect(Community.isSlugValid('IAM')).to.be.false
      expect(Community.isSlugValid('wow!')).to.be.false
      expect(Community.isSlugValid('uh_')).to.be.false
      expect(Community.isSlugValid('a')).to.be.false
      expect(Community.isSlugValid('abcdabcdabcdabcdabcdabcdabcdabcdabcdabcdx')).to.be.false
    })
  })

  describe('.reconcileNumMembers', () => {
    let community

    before(async () => {
      community = await factories.community().save()
      await community.addGroupMembers([
        await factories.user().save(),
        await factories.user({active: false}).save()
      ])
    })

    it('sets num_members correctly', async () => {
      await community.reconcileNumMembers()
      expect(community.get('num_members')).to.equal(1)
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
      const community = await factories.community({active: true}).save()
      await Community.deactivate(community.id)
      await community.refresh()
      expect(community.get('active')).to.equal(false)
      expect(Group.deactivate).to.have.been.called.with(community.id, Community)
    })
  })
})
