import validatePostData from './validatePostData'

describe('validatePostData', () => {
  var user, inGroup, notInGroup

  before(function () {
    inGroup = new Group({slug: 'foo', name: 'Foo', group_data_type: 1 })
    notInGroup = new Group({slug: 'bar', name: 'Bar', group_data_type: 1 })
    user = new User({name: 'Cat', email: 'a@b.c'})
    return Promise.join(
      inGroup.save(),
      notInGroup.save(),
      user.save()
    ).then(function () {
      return user.joinGroup(inGroup)
    })
  })

  it('fails if an invalid type is provided', () => {
    const fn = () => validatePostData(null, {name: 't', type: 'thread'})
    expect(fn).to.throw(/not a valid type/)
  })

  it('fails if no group_ids are provided', () => {
    const fn = () => validatePostData(null, {name: 't'})
    expect(fn).to.throw(/no groups specified/)
  })

  it('fails if there is a group_id for a group user is not a member of', () => {
    const data = {name: 't', group_ids: [inGroup.id, notInGroup.id]}
    return validatePostData(user.id, data)
    .catch(function (e) {
      expect(e.message).to.match(/unable to post to all those groups/)
    })
  })

  it('fails if there are more than 3 topicNames', () => {
    const fn = () => validatePostData(null, {
      name: 't',
      group_ids: [inGroup.id],
      topicNames: ['la', 'ra', 'bar', 'far']})
    expect(fn).to.throw(/too many topics in post, maximum 3/)
  })

  it('continues the promise chain if name is provided and user is member of groups', () => {
    const data = {name: 't', group_ids: [inGroup.id]}
    return validatePostData(user.id, data)
    .catch(() => expect.fail('should resolve'))
  })

  it('continues the promise chain if valid type is provided', () => {
    const data = {name: 't', type: Post.Type.PROJECT, group_ids: [inGroup.id]}
    return validatePostData(user.id, data)
    .catch(() => expect.fail('should resolve'))
  })
})
