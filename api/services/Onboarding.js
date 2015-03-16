var newUserThreshold = function(createdAt) {
  return (new Date() - createdAt) / 1000 < 60; // one minute ago
};

var Onboarding = {

  resetForUser: function(user) {
    return Tour.where({user_id: user.id, type: 'onboarding'}).destroy()
    .then(function() {
      return Onboarding.startForUser(user);
    });
  },

  startForUser: function(user) {
    var isNewUser = newUserThreshold(user.get('date_created'));

    Promise.props({
      new_user: isNewUser,
      can_skip_seed_form: (!isNewUser ? Aggregate.count(user.posts()).then(function(count) {
        return count > 0;
      }) : false)
    })
    .then(function(props) {
      return Tour.resetOnboarding(user.id, props);
    });
  },

  // re-onboard all new users, and existing users who are part of Impact Hub Oakland
  maybeStart: function(userId) {
    return Tour.collection().query().where({user_id: userId, type: 'onboarding'}).count()
    .then(function(rows) {
      return (rows[0].count > 0 ? null : Membership.where({users_id: userId}).fetchAll());
    })
    .then(function(memberships) {
      if (!memberships) return;

      var isNewOrHubOakland = function(membership) {
        return membership.get('community_id') == '9' ||
          new Date().getTime() - membership.get('date_joined').getTime() < 86400 * 1000;
      };

      if (!_.any(memberships.models, isNewOrHubOakland)) return;

      return User.find(userId).then(function(user) {
        return Onboarding.startForUser(user);
      });
    });
  }

};

module.exports = Onboarding;