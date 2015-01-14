var Promise = require('bluebird');
var sanitizeHtml = require('sanitize-html');
var Cheerio = require('cheerio');
var postAttributes = function(post, hasVote) {

  var followers = post.related("followers").map(function(follower) {
    return {
      "value": Number(follower.related("user").get("id")),
      "name": follower.related("user").get("name"),
      "avatar": follower.related("user").get("avatar_url")
    }
  });

  var contributors = post.related("contributors").map(function(contributor) {
    return {
      "id": Number(contributor.related("user").get("id")),
      "name": contributor.related("user").get("name"),
      "avatar": contributor.related("user").get("avatar_url")
    };
  });

  return {
    "id": Number(post.get("id")),
    "name": post.get("name"),
    "description": post.get("description"),
    "postType": post.get("type"),
    "imageUrl": post.get("image_url"),
    "user": {
      "id": Number(post.related("creator").get("id")),
      "name": post.related("creator").get("name"),
      "avatar": post.related("creator").get("avatar_url")
    },
    "creationDate": post.get("creation_date"),
    "votes": post.get("num_votes"),
    "numComments": post.get("num_comments"),
    "fulfilled": post.get("fulfilled"),
    "contributors": contributors,
    "communitySlug": post.related("communities").first().get("slug"),
    "cName": post.related("communities").first().get("name"),
    "myVote": hasVote,
    "comments": [], // TODO Load Comments?
    "commentsLoaded": false,
    "followers": followers,
    "followersLoaded": true,
    "numFollowers": followers.length
  }
};

var commentAttributes = function(comment, user, isThanked) {
  return {
    "id": Number(comment.get("id")),
    "isThanked": isThanked,
    "text": comment.get("comment_text"),
    "timestamp": comment.get("date_commented"),
    "user": {
      "id": Number(comment.related("user").get("id")),
      "name": comment.related("user").get("name"),
      "avatar": comment.related("user").get("avatar_url"),
    }
  }
};

module.exports = {
  find: function(req, res) {
    var params = _.pick(req.allParams(), ['sort', 'limit', 'start', 'postType', 'q']),
      sortCol = (params.sort == 'top' ? 'num_votes' : 'last_updated');

    Community.find(req.param('id')).then(function(community) {

      return community.posts().query(function(qb) {
        if (params.postType && params.postType != 'all') {
          qb.where({type: params.postType});
        }
        qb.where({active: true});

        if (params.q && params.q.trim().length > 0) {
          var query = _.chain(params.q.trim().split(/\s*\s/)) // split on whitespace
            .map(function(term) { // Remove any invalid characters
              return term.replace(/[,;'|:&()!]+/, '');
            })
            .reject(_.isEmpty)
            .reduce(function(result, term, key) { // Build the tsquery string using logical | (OR) operands
              result += " | " + term;
              return result;
            }).value();

          qb.where(function() {
            this.whereRaw("(to_tsvector('english', post.name) @@ to_tsquery(?)) OR (to_tsvector('english', post.description) @@ to_tsquery(?))", [query, query]);
            //this.where("name", "ILIKE", query).orWhere("description", "ILIKE", query ) // Basic 'icontains' searching
          });
        }

        qb.orderBy(sortCol, 'desc');
        qb.limit(params.limit);
        qb.offset(params.start);
      }).fetch({
        withRelated: [
          {"creator": function(qb) {
            qb.column("id", "name", "avatar_url");
          }},
          {"communities": function(qb) {
            qb.column("id", 'name', "slug");
          }},
          "followers",
          {"followers.user": function(qb) {
            qb.column("id", "name", "avatar_url");
          }},
          "contributors",
          {"contributors.user": function(qb) {
            qb.column("id", "name", "avatar_url");
          }}
        ]
      });

    }).then(function(posts) {

      var postIds = posts.pluck("id");
      return Promise.props({
        posts: posts,
        votes: Vote.forUserInPosts(req.session.user.id, postIds).pluck("post_id")
      });

    }).then(function(data) {

      res.ok(data.posts.map(function(post) {
        return postAttributes(post, _.contains(data.votes, post.get("id")));
      }));

    });
  },

  comment: function(req, res) {
    var params = _.pick(req.allParams(), ['id', 'text']);

    // Remove leading &nbsp; from html. (a side-effect of contenteditable is the leading &nbsp;)
    var text = params.text.replace(/<p>&nbsp;|<p>&NBSP;/g, "<p>");

    var $ = Cheerio.load(text);

    // Get any mentions in the comment.
    var mentions = $("a[data-uid]").map(function(i, elem) {
      return $(this).data("uid");
    }).get();

    var cleanText = sanitizeHtml(text, {
      allowedTags: [ 'a', 'p' ],
      allowedAttributes: {
        'a': [ 'href', 'data-uid' ]
      },

      // Removes empty paragraphs
      exclusiveFilter: function(frame) {
        return frame.tag === 'p' && !frame.text.trim();
      }
    });

    new Comment({
      comment_text: cleanText,
      date_commented: new Date(),
      post_id: res.locals.post.id,
      user_id: req.session.user.id,
      active: true
    }).save().then(function(comment) {
        // add followers to post of new comment
        mentions.forEach(function(userId) {
          Follower.addFollower(res.locals.post.id, userId, req.session.user.id).then(function(follower) {
            sails.log.debug("added follower to post");
          }).catch(function(err) {
            sails.log.debug("user already following post... failing silently");
          });
        });

        return Promise.props({
          comment: comment.fetch({withRelated: [
            {"user": function(qb) {
              qb.column("id", "name", "avatar_url");
            }}
          ]}),
          isThanked: Thank.didUserThank(comment.id, req.session.user.id)
        });
    }).then(function(data) {
      res.ok(commentAttributes(data.comment, data.isThanked))
    });
  }
};
