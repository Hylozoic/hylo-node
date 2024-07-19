import knexPostgis from 'knex-postgis'
import wkx from 'wkx'
var Buffer = require('buffer').Buffer

module.exports = bookshelf.Model.extend({
  tableName: 'locations',
  requireFetch: false,
  hasTimestamps: true,

  format(attributes) {
    const st = knexPostgis(bookshelf.knex);

    // Make sure geometry columns go into the database correctly
    const { bbox, center } = attributes
    if (bbox && bbox[0] && bbox[1]) {
      attributes.bbox = st.geomFromText('POLYGON((' + bbox[0].lng + ' ' + bbox[0].lat + ', ' + bbox[0].lng + ' ' + bbox[1].lat + ', ' + bbox[1].lng + ' ' + bbox[1].lat + ', ' + bbox[1].lng + ' ' + bbox[0].lat + ', ' + bbox[0].lng + ' ' + bbox[0].lat +  '))', 4326)
    } else {
      delete attributes.bbox
    }

    if (center && center.lng && center.lat) {
      attributes.center = st.geomFromText('POINT(' + center.lng + ' ' + center.lat + ')', 4326)
    } else {
      delete attributes.center
    }

    return attributes
  },

  parse(response) {
    const st = knexPostgis(bookshelf.knex)

    // Convert geometry hex values into useful objects before returning to the client
    if (typeof response.center == 'string') {
      const b = Buffer.from(response.center, 'hex')
      const parsedCenter = wkx.Geometry.parse(b)
      response.center = {lng: parsedCenter.x, lat: parsedCenter.y}
    }

    if (typeof response.bbox == 'string') {
      const b = Buffer.from(response.bbox, 'hex');
      const parsedBbox = wkx.Geometry.parse(b);
      response.bbox = parsedBbox.exteriorRing.map(point => {return { lng: point.x, lat: point.y }})
    }

    return response
  },

  groups: function () {
    return this.hasMany(Group)
  },

  posts: function () {
    return this.hasMany(Post)
  },

  users: function () {
    return this.hasMany(User)
  }

}, {
  create (attrs, { transacting } = {}) {
    return this.forge(Object.assign({created_at: new Date(), updated_at: new Date()}, attrs))
      .save({}, { transacting })
  },
})
