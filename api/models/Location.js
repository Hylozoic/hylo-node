const knexPostgis = require('knex-postgis');

module.exports = bookshelf.Model.extend({
  tableName: 'locations',

  users: function () {
    return this.hasMany(User)
  },

  posts: function () {
    return this.hasMany(Post)
  },
}, {
  create: function (attrs) {
    const { bbox, center } = attrs

    const st = knexPostgis(bookshelf.knex);

    if (bbox) {
      attrs.bbox = st.geomFromText('POLYGON((' + bbox[0].lng + ' ' + bbox[0].lat + ', ' + bbox[0].lng + ' ' + bbox[1].lat + ', ' + bbox[1].lng + ' ' + bbox[1].lat + ', ' + bbox[1].lng + ' ' + bbox[0].lat + ', ' + bbox[0].lng + ' ' + bbox[0].lat +  '))', 4326)
    }

    if (center) {
      attrs.center = st.geomFromText('POINT(' + center.lng + ' ' + center.lat + ')', 4326)
    }

    return this.forge(attrs).save()
  },
})