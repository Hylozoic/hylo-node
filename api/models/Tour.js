module.exports = bookshelf.Model.extend({

  tableName: 'tours',

  user: function() {
    return this.belongsTo(User);
  }

}, {

  // set opts.new_user to true or false depending on whether onboarding is
  // being activated for a newly-created user or an existing one
  resetOnboarding: function(userId, opts) {
    var tour = new Tour({
      user_id: userId,
      type: 'onboarding',
      status: _.merge(
        _.pick(opts, 'new_user', 'can_skip_seed_form'),
        {step: 'start'}
      ),
      created_at: new Date()
    });
    return tour.save();
  }

});