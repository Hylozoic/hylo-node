import {
  addSkill,
  removeSkill,
  flagInappropriateContent
} from '../../../../api/graphql/mutations'
import root from 'root-path'
require(root('test/setup'))
const factories = require(root('test/setup/factories'))

describe('mutations', () => {
  var u1, community

  before(() => {
    community = factories.community()
    u1 = factories.user()
    return Promise.join(
      community.save(), u1.save())
    .then(() => Promise.join(
      u1.joinCommunity(community)
    ))
  })

  it('can add a skill', () => {
    return addSkill(u1.id, 'New Skill')
      .then(skill => {
        expect(skill.get('name')).to.equal('New Skill')
      })
  })

  it('fails when adding a skill with 0 length', () => {
    expect(() => addSkill(u1.id, '')).to.throw('blank')
  })

  it('fails for skills larger than 40 characters', () => {
    expect(() => addSkill(u1.id, '01234567890123456789012345678901234567890')).to.throw('must be less')
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

  it('flags post with valid parameters', () => {
    let flaggedContent
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
    let flaggedContent
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
    let flaggedContent
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
    let flaggedContent
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
    let flaggedContent
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
    let flaggedContent
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
