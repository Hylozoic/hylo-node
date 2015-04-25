var setup = require(require('root-path')('test/setup'));

describe('Post', function() {

  describe('#addFollowers', function() {
    var u1, u2, u3, post;

    before(function(done) {
      u1 = new User();
      u2 = new User();
      u3 = new User();
      post = new Post();
      Promise.join(
        u1.save(),
        u2.save(),
        u3.save()
      ).then(function() {
        post.set('creator_id', u1.id);
        return post.save();
      }).then(function() {
        done();
      });
    });

    it('creates activity notifications', function() {
      return post.addFollowers([u2.id], u3.id, {createActivity: true}).then(function() {
        return Promise.join(
          post.load('followers'),
          Activity.where('reader_id', 'in', [u1.id, u2.id]).fetchAll()
        );
      })
      .spread(function(post, activity) {
        expect(post.relations.followers.length).to.equal(1);
        var follow = post.relations.followers.first();
        expect(follow.get('user_id')).to.equal(u2.id);
        expect(follow.get('added_by_id')).to.equal(u3.id);

        expect(activity.length).to.equal(2);
        var a1 = _.find(activity.models, function(a) { return a.get('reader_id') == u1.id });
        expect(a1).to.exist;
        expect(a1.get('action')).to.equal('follow');

        var a2 = _.find(activity.models, function(a) { return a.get('reader_id') == u2.id });
        expect(a2).to.exist;
        expect(a2.get('action')).to.equal('followAdd');
      });
    });
  });

});