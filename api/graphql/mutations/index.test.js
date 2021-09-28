import {
  addSkill,
  addSkillToLearn,
  removeSkill,
  removeSkillToLearn,
  flagInappropriateContent,
  allowGroupInvites
} from './index'
import root from 'root-path'
require(root('test/setup'))
const factories = require(root('test/setup/factories'))

describe('mutations/index', () => {
  var u1, group, protocol, domain

  before(() => {
    protocol = process.env.PROTOCOL
    domain = process.env.DOMAIN
    process.env.PROTOCOL = 'https'
    process.env.DOMAIN = 'www.hylo.com'

    group = factories.group()
    u1 = factories.user()
    return Promise.join(
      group.save(), u1.save())
    .then(() => Promise.join(
      u1.joinGroup(group)
    ))
  })

  after(() => {
    process.env.PROTOCOL = protocol
    process.env.DOMAIN = domain
  })

  it('can add a skill', async () => {
    const skill = await addSkill(u1.id, 'New Skill')
    expect(skill.get('name')).to.equal('New Skill')
  })

  it('can add a skill to learn', async () => {
    const skill = await addSkillToLearn(u1.id, 'New Skill To Learn')
    expect(skill.get('name')).to.equal('New Skill To Learn')
  })

  it('sets allow group invites', async () => {
    const results = await allowGroupInvites(group.id, true)
    expect(results.success).to.equal(true)
    await group.refresh()
    expect(group.getSetting('allow_group_invites')).to.equal(true)

    const results2 = await allowGroupInvites(group.id, false)
    expect(results2.success).to.equal(true)
    await group.refresh()
    expect(group.getSetting('allow_group_invites')).to.equal(false)
  })

  it('fails when adding a skill with 0 length', async () => {
    try {
      await addSkill(u1.id, '')
      expect.fail('should throw')
    } catch (err) {
      expect(err.message).to.include('blank')
    }
  })

  it('fails for skills larger than 40 characters', async () => {
    try {
      await addSkill(u1.id, '01234567890123456789012345678901234567890')
      expect.fail('should throw')
    } catch (err) {
      expect(err.message).to.include('must be less')
    }
  })

  it('removes a skill from a user', () => {
    let skillToRemove
    let name = 'toBeRemoved'
    return addSkill(u1.id, name)
    .then(skill => {
      skillToRemove = skill
      return u1.skills().fetch()
    })
    .then(skills => {
      expect(skills.toJSON()).to.contain.a.thing.with.property('name', name)
      return removeSkill(u1.id, skillToRemove.id)
    })
    .then(response => {
      expect(response).to.have.property('success', true)
      return u1.skills().fetch()
    })
    .then(skills => {
      expect(skills.toJSON()).to.not.contain.a.thing.with.property('name', name)
    })
  })

  it('removes a skill to learn from a user', () => {
    let skillToRemove
    let name = 'toBeRemoved'
    return addSkillToLearn(u1.id, name)
    .then(skill => {
      skillToRemove = skill
      return u1.skillsToLearn().fetch()
    })
    .then(skillsToLearn => {
      expect(skillsToLearn.toJSON()).to.contain.a.thing.with.property('name', name)
      return removeSkillToLearn(u1.id, skillToRemove.id)
    })
    .then(response => {
      expect(response).to.have.property('success', true)
      return u1.skillsToLearn().fetch()
    })
    .then(skillsToLearn => {
      expect(skillsToLearn.toJSON()).to.not.contain.a.thing.with.property('name', name)
    })
  })

  it('flags post with valid parameters', () => {
    let data = {
      category: 'spam',
      reason: 'my post reason',
      linkData: {
        id: 10,
        type: 'post'
      }
    }

    return flagInappropriateContent(u1.id, data)
    .then(result => {
      expect(result).to.have.property('success', true)
      return FlaggedItem.where('category', 'spam').fetch()
    })
    .then(flaggedItem => {
      expect(flaggedItem.toJSON()).to.have.property('reason', 'my post reason')
    })
  })

  it('flags comment with valid parameters', () => {
    let data = {
      category: 'inappropriate',
      reason: 'my comment reason',
      linkData: {
        id: 10,
        type: 'comment'
      }
    }

    return flagInappropriateContent(u1.id, data)
    .then(result => {
      expect(result).to.have.property('success', true)
      return FlaggedItem.where('category', 'inappropriate').fetch()
    })
    .then(flaggedItem => {
      expect(flaggedItem.toJSON()).to.have.property('reason', 'my comment reason')
    })
  })

  it('flags member with valid parameters', () => {
    let data = {
      category: 'illegal',
      reason: 'my member reason',
      linkData: {
        id: 10,
        type: 'member'
      }
    }

    return flagInappropriateContent(u1.id, data)
    .then(result => {
      expect(result).to.have.property('success', true)
      return FlaggedItem.where('category', 'illegal').fetch()
    })
    .then(flaggedItem => {
      expect(flaggedItem.toJSON()).to.have.property('reason', 'my member reason')
    })
  })

  it('flags content with non-other category and empty reason', () => {
    let data = {
      category: 'abusive',
      reason: '',
      linkData: {
        id: 10,
        type: 'member'
      }
    }

    return flagInappropriateContent(u1.id, data)
    .then(result => {
      expect(result).to.have.property('success', true)
      return FlaggedItem.where('category', 'abusive').fetch()
    })
    .then(flaggedItem => {
      expect(flaggedItem.toJSON()).to.have.property('reason', '')
    })
  })

  it('fails to flag unidentified content with valid parameters', (done) => {
    let data = {
      category: 'safety',
      reason: 'my UFO reason',
      linkData: {
        id: 10,
        type: 'ufo'
      }
    }

    expect(flagInappropriateContent(u1.id, data)).to.eventually.be.rejectedWith(Error, 'Invalid Link Type').and.notify(done)
  })

  it('fails to flag inappropriate content with type: other and no reason', (done) => {
    let data = {
      category: 'other',
      reason: '',
      linkData: {
        id: 10,
        type: 'post'
      }
    }

    expect(flagInappropriateContent(u1.id, data)).to.eventually.be.rejected.and.notify(done)
  })
})
