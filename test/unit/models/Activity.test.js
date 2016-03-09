var setup = require(require('root-path')('test/setup'));

describe('Activity', function() {

  describe("#forComment", function() {

    var comment;
    before(function() {
      comment = new Comment({
        id: '4',
        user_id: '5',
        post_id: '6',
        text: 'foo'
      });
    });

    it('works', function() {
      var activity = Activity.forComment(comment, '7');

      expect(activity.get('comment_id')).to.equal('4');
      expect(activity.get('actor_id')).to.equal('5');
      expect(activity.get('post_id')).to.equal('6');
      expect(activity.get('action')).to.equal('comment');
    });

    it('sets action = "mention" for mentions', function() {
      comment.set('text', 'yo <a data-user-id="7">Bob</a>!');
      var activity = Activity.forComment(comment, '7');

      expect(activity.get('comment_id')).to.equal('4');
      expect(activity.get('actor_id')).to.equal('5');
      expect(activity.get('post_id')).to.equal('6');
      expect(activity.get('action')).to.equal('mention');
    });

  });

})