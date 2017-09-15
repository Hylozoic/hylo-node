import root from 'root-path'
require(root('test/setup'))
const factories = require(root('test/setup/factories'))

import {
  addSkill,
  removeSkill
} from '../../../../api/graphql/mutations'

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
    expect(() => addSkill(u1.id, '')).to.throw('empty')
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
})
