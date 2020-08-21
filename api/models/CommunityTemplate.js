import { includes } from 'lodash'

var knex = bookshelf.knex

module.exports = bookshelf.Model.extend({
  tableName: 'community_templates',

  communities: function () {
    return this.hasMany(Community).query({where: {'communities.active': true}})
  },

  defaultTopics: function () {
    return this.belongsToMany(Tag, 'community_template_default_topics', 'community_template_id', 'tag_id')
  },

}, {

})
