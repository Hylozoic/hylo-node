var format = require('util').format;

module.exports = bookshelf.Model.extend({
  tableName: 'devices',
    
    user: function () {
	return this.belongsTo(User, "user_id");
    }
    
}, {
    foop: function () {
	console.log("Foop Ran");
    }
});
