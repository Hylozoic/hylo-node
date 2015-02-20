module.exports = bookshelf.Model.extend({

  tableName: 'tours',

  user: function() {
    return this.belongsTo(User);
  }

}, {

  resetOnboarding: function(userId) {
    var tour = new Tour({
      user_id: userId,
      type: 'onboarding',
      status: {step: 'start'},
      created_at: new Date()
    });
    return tour.save();
  }

});