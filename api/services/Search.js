import forUsers from "./Search/forUsers";
import forPosts from "./Search/forPosts";
import { countTotal } from "../../lib/util/knex";
import addTermToQueryBuilder from "./Search/addTermToQueryBuilder";
import { filterAndSortCommunities } from "./Search/util";
import { transform } from "lodash";
import { flatten, flow, uniq, get } from "lodash/fp";
import { myCommunityIds } from "../models/util/queryFilters";

module.exports = {
  forPosts,

  forUsers,

  forSkills: (opts) => Skill.search(opts),

  forCommunities: function (opts) {
    return Community.query((qb) => {
      if (opts.communities) {
        qb.whereIn("communities.id", opts.communities);
      }

      if (opts.autocomplete) {
        qb.whereRaw("communities.name ilike ?", opts.autocomplete + "%");
      }

      if (opts.networkSlugs) {
        qb.join("networks", "communities.network_id", "=", "networks.id");
        qb.whereIn("networks.slug", opts.networkSlugs);
      }

      if (opts.networks) {
        qb.whereIn("communities.network_id", opts.networks);
      }

      if (opts.slug) {
        qb.whereIn("communities.slug", opts.slug);
      }

      if (opts.is_public) {
        qb.where("is_public", opts.is_public);
      }

      filterAndSortCommunities(
        {
          search: opts.term,
          sortBy: opts.sort,
          boundingBox: opts.boundingBox,
        },
        qb
      );

      // this counts total rows matching the criteria, disregarding limit,
      // which is useful for pagination
      countTotal(qb, "communities", opts.totalColumnName);

      qb.limit(opts.limit);
      qb.offset(opts.offset);
      qb.groupBy("communities.id");
    });
  },

  forTags: function (opts) {
    return Tag.query((q) => {
      q.join("communities_tags", "communities_tags.tag_id", "=", "tags.id");
      q.join(
        "communities",
        "communities.id",
        "=",
        "communities_tags.community_id"
      );
      q.where("communities.id", "in", myCommunityIds(opts.userId));
      q.where("communities.active", true);

      if (opts.communitySlug) {
        q.where("communities.slug", "=", opts.communitySlug);
      }

      if (opts.networkSlug) {
        q.join("networks", "networks.id", "communities.network_id");
        q.where("networks.slug", "=", opts.networkSlug);
      }

      if (opts.name) {
        q.where("tags.name", opts.name);
      }

      if (opts.autocomplete) {
        q.whereRaw("tags.name ilike ?", opts.autocomplete + "%");
      }

      if (opts.isDefault) {
        q.where("communities_tags.is_default", true);
      }

      if (opts.visibility) {
        q.where("communities_tags.visibility", "in", opts.visibility);
      }

      if (opts.sort) {
        if (opts.sort === "name") {
          q.orderByRaw("lower(tags.name) ASC");
        } else if (opts.sort === "num_followers") {
          q.select(
            bookshelf.knex.raw(
              "sum(communities_tags.num_followers) as num_followers"
            )
          );
          q.orderBy("num_followers", "desc");
        } else {
          q.orderBy(opts.sort, "asc");
        }
      }

      countTotal(q, "tags", opts.totalColumnName);

      q.groupBy("tags.id");
      q.limit(opts.limit);
    });
  },

  fullTextSearch: function (userId, args) {
    let items, total;
    args.limit = args.first;
    return fetchAllCommunityIds(userId, args)
      .then((communityIds) =>
        FullTextSearch.searchInCommunities(communityIds, args)
      )
      .then((items_) => {
        items = items_;
        total = get("0.total", items);

        const ids = transform(
          items,
          (ids, item) => {
            const type = item.post_id
              ? "posts"
              : item.comment_id
              ? "comments"
              : "people";

            if (!ids[type]) ids[type] = [];
            const id = item.post_id || item.comment_id || item.user_id;
            ids[type].push(id);
          },
          {}
        );

        return Promise.join(
          ids.posts && Post.where("id", "in", ids.posts).fetchAll(),
          ids.comments && Comment.where("id", "in", ids.comments).fetchAll(),
          ids.people && User.where("id", "in", ids.people).fetchAll(),
          (posts, comments, people) =>
            items.map(presentResult(posts, comments, people))
        );
      })
      .then((models) => ({ models, total }));
  },
};

const fetchAllCommunityIds = (userId, { communityIds, networkId }) => {
  if (communityIds) return Promise.resolve(communityIds);
  if (networkId) {
    return Network.find(networkId, { withRelated: "communities" }).then((n) =>
      n.relations.communities.map((c) => c.id)
    );
  }
  return Promise.join(
    Network.activeCommunityIds(userId),
    Group.pluckIdsForMember(userId, Community)
  ).then(flow(flatten, uniq));
};

const obfuscate = (text) => Buffer.from(text).toString("hex");

const presentResult = (posts, comments, people) => (item) => {
  if (item.user_id) {
    return {
      id: obfuscate(`user_id-${item.user_id}`),
      content: people.find((p) => p.id === item.user_id),
    };
  } else if (item.post_id) {
    return {
      id: obfuscate(`post_id-${item.post_id}`),
      content: posts.find((p) => p.id === item.post_id),
    };
  } else if (item.comment_id) {
    return {
      id: obfuscate(`comment_id-${item.comment_id}`),
      content: comments.find((c) => c.id === item.comment_id),
    };
  }
  return null;
};
