module.exports = bookshelf.Model.extend(
  {
    tableName: "contributions",

    post: function () {
      return this.belongsTo(Post, "post_id");
    },

    user: function () {
      return this.belongsTo(User, "user_id").query({ where: { active: true } });
    },

    createActivities: function (trx) {
      return this.load(["post"]).then(() => {
        const contribution = {
          reader_id: this.get("user_id"),
          contribution_id: this.id,
          post_id: this.relations.post.id,
          actor_id: this.relations.post.get("user_id"),
          reason: "newContribution",
        };
        return Activity.saveForReasons([contribution], trx);
      });
    },
  },
  {
    find: (id, options) => Contribution.where({ id }).fetch(options),

    create: function (user_id, post_id, trx) {
      return new Contribution({ post_id, user_id, contributed_at: new Date() })
        .save(null, { transacting: trx })
        .then((contribution) =>
          Queue.classMethod("Contribution", "createActivities", {
            contributionId: contribution.id,
          })
        );
    },

    queryForUser: function (userId, communityIds) {
      return Contribution.query((q) => {
        q.orderBy("contributed_at");
        q.join("posts", "posts.id", "=", "contributions.post_id");

        q.where({ "contributions.user_id": userId, "posts.active": true });

        if (communityIds) {
          q.join(
            "communities_posts",
            "communities_posts.post_id",
            "=",
            "posts.id"
          );
          q.join(
            "communities",
            "communities.id",
            "=",
            "communities_posts.community_id"
          );
          q.whereIn("communities.id", communityIds);
        }
      });
    },

    countForUser: function (user) {
      return this.query()
        .count()
        .where({
          "contributions.user_id": user.id,
          "posts.active": true,
        })
        .join("posts", function () {
          this.on("posts.id", "=", "contributions.post_id");
        })
        .then(function (rows) {
          return rows[0].count;
        });
    },

    createActivities: (opts) =>
      Contribution.find(opts.contributionId).then(
        (contribution) =>
          contribution &&
          bookshelf.transaction((trx) => contribution.createActivities(trx))
      ),
  }
);
