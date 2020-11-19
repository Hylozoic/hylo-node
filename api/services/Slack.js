const format = require("util").format;
const Promise = require("bluebird");
const request = require("request");
const post = Promise.promisify(request.post);

module.exports = {
  textForNewPost: function (post, community) {
    let relatedUser;
    const creator = post.relations.user;
    if (post.isWelcome()) {
      relatedUser = post.relations.relatedUsers.first();
      return format(
        "<%s|%s> joined <%s|%s>",
        Frontend.Route.profile(relatedUser),
        relatedUser.get("name"),
        Frontend.Route.community(community),
        community.get("name")
      );
    } else {
      return format(
        "<%s|%s> posted <%s|%s> in <%s|%s>",
        Frontend.Route.profile(creator),
        creator.get("name"),
        Frontend.Route.post(post, community),
        post.get("name"),
        Frontend.Route.community(community),
        community.get("name")
      );
    }
  },
  send: (message, uri) =>
    !process.env.DISABLE_SLACK_INTEGRATION &&
    post({
      uri,
      body: { text: message },
      json: true, // Automatically stringifies the body to JSON
    }),
};
