import knexPostgis from "knex-postgis";

module.exports = bookshelf.Model.extend(
  {
    tableName: "saved_searches",

    boundingBox: async function () {
      const st = knexPostgis(bookshelf.knex);
      const data = await bookshelf
        .knex("saved_searches")
        .where({ id: this.id })
        .select(st.asGeoJSON("bounding_box", 4326));
      const coordinates = JSON.parse(data[0].bounding_box).coordinates[0];
      const boundingBox = [
        coordinates[0][0],
        coordinates[0][1],
        coordinates[2][0],
        coordinates[2][1],
      ];
      return boundingBox;
    },

    community: async function () {
      return this.get("context") === "community"
        ? await Community.find(this.get("context_id"))
        : null;
    },

    network: async function () {
      return this.get("context") === "network"
        ? await Network.find(this.get("context_id"))
        : null;
    },

    topics: async function () {
      const searchId = this.id;
      const query = `select t.* from saved_search_topics sst
    left join tags as t on sst.tag_id = t.id
    where sst.saved_search_id = ${searchId}`;
      const result = await bookshelf.knex.raw(query);
      return result.rows || [];
    },

    newPosts: async function () {
      const searchId = this.id;
      const topics = await this.topics();
      const searchText = this.get("search_text");
      const contextQuery = this.getContextQuery();

      const query = `
    with posts_with_locations as (
      select p.id, p.description, p.name, p.type, p.is_public, loc.center as location, array_agg(t.tag_id)::integer[] as tag_ids from posts p
      left join locations loc on p.location_id = loc.id
      left join posts_tags t on p.id = t.post_id
      where loc.id is not null
      group by p.id, p.description, p.name, p.type, p.is_public, loc.center
    ),
    search as (
      select s.bounding_box, s.last_post_id, CONCAT('%',search_text,'%') as search_text, s.post_types, array_agg(sst.tag_id)::integer[] as tag_ids from saved_searches s
      left join saved_search_topics sst on s.id = sst.saved_search_id
      where s.id=${searchId}
      group by s.id
    )
    select p.id from posts_with_locations p
    where ST_Within(p.location, (select bounding_box from search limit 1))=true
    and p.id > (select last_post_id from search)
    ${
      searchText
        ? "and (p.name ilike (select search_text from search) or p.description ilike (select search_text from search))"
        : ""
    }
    ${topics.length > 0 ? "and p.tag_ids && (select tag_ids from search)" : ""}
    and CONCAT('{',p.type,'}')::varchar[] && (select post_types from search)
    ${contextQuery}
    order by p.id desc 
    `;
      const result = await bookshelf.knex.raw(query);
      const postIds = (result.rows || []).map((p) => p.id);
      const posts = await Post.query().where("id", "in", postIds);
      return posts;
    },

    getContextQuery: function () {
      const context = this.get("context");
      const lastPostId = this.get("last_post_id");
      const userId = this.get("user_id");

      let query;

      switch (context) {
        case "all":
          query = `
          and p.id in (select p.id from posts p
          left join communities_posts cp on p.id = cp.post_id
          left join communities_users cu on cu.community_id = cp.community_id
          where cu.user_id=${userId}
          and p.id > ${lastPostId})
        `;
          break;
        case "public":
          query = `
          and p.is_public = true
        `;
          break;
        case "community":
          query = `
          and p.id in (select p.id from posts p
          left join communities_posts cp on p.id = cp.post_id
          where cp.community_id=${this.get("context_id")}
          and p.id > ${lastPostId})
        `;
          break;
        case "network":
          query = `
          and p.id in (select p.id from posts p
          left join communities_posts cp on p.id = cp.post_id
          left join communities c on c.id = cp.community_id
          where c.network_id=${this.get("context_id")}
          and p.id > ${lastPostId})
        `;
          break;
      }

      return query;
    },

    updateLastPost: async function (id, last_post_id) {
      await SavedSearch.query().where({ id }).update({ last_post_id });
      return id;
    },
  },
  {
    create: async function (params) {
      const {
        boundingBox,
        communitySlug,
        context,
        lastPostId,
        name,
        networkSlug,
        postTypes,
        searchText,
        topicIds,
        userId,
      } = params;

      let community, network, context_id;

      const validContexts = ["all", "public", "network", "community"];
      if (!validContexts.includes(context))
        throw new Error(`Invalid context: ${context}`);

      if (context === "community") {
        community = await Community.find(communitySlug);
        context_id = community.id;
      }

      if (context === "network") {
        network = await Network.find(networkSlug);
        context_id = network.id;
      }

      const st = knexPostgis(bookshelf.knex);
      const bounding_box = st.geomFromText(
        "POLYGON((" +
          boundingBox[0].lng +
          " " +
          boundingBox[0].lat +
          ", " +
          boundingBox[0].lng +
          " " +
          boundingBox[1].lat +
          ", " +
          boundingBox[1].lng +
          " " +
          boundingBox[1].lat +
          ", " +
          boundingBox[1].lng +
          " " +
          boundingBox[0].lat +
          ", " +
          boundingBox[0].lng +
          " " +
          boundingBox[0].lat +
          "))",
        4326
      );

      const attributes = {
        user_id: userId,
        name,
        created_at: new Date(),
        context_id,
        context,
        is_active: true,
        search_text: searchText,
        post_types: postTypes,
        bounding_box,
        last_post_id: lastPostId,
      };

      const search = await this.forge(attributes).save();

      topicIds.forEach((tag_id) =>
        SavedSearchTopic.create({ tag_id, saved_search_id: search.id })
      );

      return search;
    },

    delete: async function (id) {
      await SavedSearch.query().where({ id }).update({ is_active: false });
      return id;
    },
  }
);
