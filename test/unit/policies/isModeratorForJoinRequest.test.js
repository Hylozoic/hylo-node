var setup = require(require('root-path')('test/setup'));
var isModeratorForJoinRequest = require(require('root-path')('api/policies/isModeratorForJoinRequest'));

checkThatUserIsBlocked = function(userId, joinRequestId, next, done) {
  req = {
    session: {userId: userId},
    param: function(name) {
      return (name == 'joinRequestId') ? joinRequestId : undefined
    }
  }
  res = {
    locals: {},
    forbidden: spy(function() {})
  }
  return isModeratorForJoinRequest(req, res, next)
  .then(() => {
    expect(next).to.not.have.been.called()
    expect(res.forbidden).to.have.been.called()
    done()
  }).catch(done)
}

describe('isModeratorForJoinRequest', function() {
  var fixtures, req, res, next;

  before(function() {
    return setup.clearDb().then(function() {
      return Promise.props({
        // User u1 is the moderator of community c1.
        u1: new User({name: 'U1'}).save(),
        // User u2 is a non-moderator user already in community c1.
        u2: new User({name: 'U2'}).save(),
        // User u3 is a user who is asking to join community c1.
        u3: new User({name: 'U3'}).save(),
        c1: new Community({name: "C1", slug: 'c1'}).save(),
      });
    })
    .then(function(props) {
      fixtures = props;
      return Promise.props({
        m1: Membership.create(props.u1.id, props.c1.id, {role: Membership.MODERATOR_ROLE}),
        m2: Membership.create(props.u2.id, props.c1.id),
        cjr1: new CommunityJoinRequest({community_id: props.c1.id, user_id: props.u3.id}).save()
      });
    }).then(function(props) {
      fixtures.m1 = props.m1;
      fixtures.m2 = props.m2;
      fixtures.cjr1 = props.cjr1;
    })
  });

  beforeEach(() => {
    next = spy()
  })

  it('has working fixtures', () => {
    return Membership.hasModeratorRole(fixtures.u1.get('id'), fixtures.c1.get('id'))
    .then(isModerator => expect(isModerator).to.be.true)
    .then(() => Membership.hasModeratorRole(fixtures.u2.get('id'), fixtures.c1.get('id')))
    .then(isModerator2 => expect(isModerator2).to.be.false)
  })

  it('allows the moderator to pass', (done) => {
    req = {
      session: {userId: fixtures.u1.id},
      param: function(name) {
        return (name == 'joinRequestId') ? fixtures.cjr1.id : undefined
      }
    }
    res = {locals: {}}
    return isModeratorForJoinRequest(req, res, next)
    .then(() => {
      expect(next).to.have.been.called()
      done()
    }).catch(done)
  })

  it('blocks a non-moderator in the community', (done) => {
    checkThatUserIsBlocked(fixtures.u2.id, fixtures.cjr1.id, next, done)
  })

  it('blocks a non-member of the community', (done) => {
    checkThatUserIsBlocked(fixtures.u3.id, fixtures.cjr1.id, next, done)
  })
});

