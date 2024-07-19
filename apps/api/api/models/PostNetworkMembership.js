module.exports = bookshelf.Model.extend({
  tableName: 'networks_posts',
  requireFetch: false,

  post: function () {
    return this.belongsTo(Post)
  },

  network: function () {
    return this.belongsTo(Network)
  }

}, {

  find: function (post_id, network_id_or_slug, options) { // eslint-disable-line
    var fetch = network_id => // eslint-disable-line
      PostNetworkMembership.where({post_id, network_id}).fetch(options)

    if (isNaN(Number(network_id_or_slug))) {
      return Network.find(network_id_or_slug)
      .then(function (network) {
        if (network) return fetch(network.id, options)
      })
    }

    return fetch(network_id_or_slug)
  }
})
