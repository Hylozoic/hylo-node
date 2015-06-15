var relationsForSelf = [
  'memberships',
  {'memberships.community': function(qb) {
    qb.column('id', 'name', 'avatar_url', 'background_url', 'description', 'leader_id', 'slug', 'welcome_message');
  }},
  {'memberships.community.leader': function(qb) {
    qb.column('id', 'name', 'avatar_url');
  }},
  'skills',
  'organizations',
  'phones',
  'emails',
  'websites',
  'linkedAccounts',
  'onboarding'
];

var extraAttributes = function(user) {
  return Promise.props({
    public_email: user.encryptedEmail(),
    skills: Skill.simpleList(user.relations.skills),
    organizations: Organization.simpleList(user.relations.organizations),
    phones: UserPhone.simpleList(user.relations.phones),
    emails: UserEmail.simpleList(user.relations.emails),
    websites: UserWebsite.simpleList(user.relations.websites),
    post_count: Post.countForUser(user),
    contribution_count: Contribution.countForUser(user),
    thank_count: Thank.countForUser(user)
  });
};

var selfOnlyAttributes = function(user, isAdmin) {
  return Promise.props({
    notification_count: Activity.unreadCountForUser(user),
    is_admin: isAdmin
  });
};

var UserPresenter = module.exports = {

  fetchForSelf: function(userId, isAdmin) {
    return User.find(userId, {withRelated: relationsForSelf})
    .tap(user => { if (!user) throw "User not found"; })
    .then(user => Promise.join(user.toJSON(), extraAttributes(user), selfOnlyAttributes(user, isAdmin)))
    .then(attributes => _.extend.apply(_, attributes));
  },

  presentForSelf: function(attributes, session) {
    return _.extend(attributes, {provider_key: session.userProvider});
  },

  fetchForOther: function(id) {
    return User.find(id, {withRelated: ['skills', 'organizations', 'phones', 'emails', 'websites']})
    .tap(user => { if (!user) throw "User not found"; })
    .then(user => Promise.join(user, extraAttributes(user)))
    .spread((user, extraAttributes) =>
      _.chain(user.attributes)
      .pick([
        'id', 'name', 'avatar_url', 'bio', 'work', 'intention', 'extra_info',
        'twitter_name', 'linkedin_url', 'facebook_url'
      ])
      .extend(extraAttributes).value());
  }

};