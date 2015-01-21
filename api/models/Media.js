module.exports = bookshelf.Model.extend({

  post: function() {
    return this.belongsTo(Post);
  }

});