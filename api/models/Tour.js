module.exports = bookshelf.Model.extend({

  tableName: 'tours',

  user: function() {
    return this.belongsTo(User);
  }

}, {

  startOnboarding: function(userId, opts) {
    return new Tour({
      user_id: userId,
      type: 'onboarding',
      status: {step: 'start'},
      created_at: new Date()
    }).save({}, _.pick(opts, 'transacting'));
  }

});