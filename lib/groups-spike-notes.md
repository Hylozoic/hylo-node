## schema sketch

```
Group
  id
  polymorphic_type
    Community
    Network
    Post
    Topic
  polymorphic_id

GroupMembership
  id
  group_id
  user_id
  active
  role
  settings
  created_at
  updated_at
  last_viewed_at

GroupConnection
  id
  parent_group_id
  child_group_id
  settings
  active
  created_at
  updated_at
```

If we want to efficiently query values that are stored in the `settings` columns
then we will need to create indexes on them. e.g.:

```
create index on group_memberships ((settings->>'lastReadAt'));
```

## notes

Relationship between a user and group:
* Basic belonging (e.g. is a member)
* Special privileges (e.g. moderation)
* Subscription/following
* Notification settings
* Activity data (e.g. last read timestamp)

Relationship between a group and a parent group:
* Basic belonging
* Special settings (e.g. a community is hidden from the network)

The basic directionality of GroupConnection is that one group contains the other
group, right? We would want to have constraints so that when you have a relation
between a network and a community, say, the network id is always parent_group_id
and the community_id is always child_group_id.

### making changes

Use cases to generalize:

```
user
  follow a post
    post.group.addMember(user)
  subscribe to a topic
    topic.group.addMember(user)
  belong to a community
    community.group.addMember(user)
  moderate a community
    community.group.addMember(user, { role, settings })
community
  belong to a network
    network.group.addChildGroup(community)
post
  belong to a community
    community.group.addChildGroup(post)
  belong to a topic
    topic.group.addChildGroup(post)
  belong to a network
    network.group.addChildGroup(post)
```

### querying

Given the above, how do we efficiently select subsets of all child groups of a
network based on type? i.e. all posts or all communities.
Join group_connections to groups to read group_data_type, I guess.

Or denormalize: add parent_ and child_group_data_type to group_connections;
get a list of group ids; use those ids in a subquery to get object ids

--------------------------------------------------------------------------------

`tag_follows` is an interesting one since it's a three-way relation between a
community, a topic, and a user... Is it a group with two parent groups, one of
which is a community and one of which is a topic?

"Find my topic subscriptions" would then mean: Find my group memberships where
the group is the child of one community group and one topic group. i.e.:

```
select t.name
from group_memberships m
join groups g_child on m.group_id = g_child.id
join group_connections gc_commu on g_child.id = gc_commu.child_group_id
join groups g_commu on gc_commu.parent_group_id = g_commu.id
join group_connections gc_topic on g_child.id = gc_topic.child_group_id
join groups g_topic on gc_topic.parent_group_id = g_topic.id
join tags t on g_topic.group_data_id = t.id
where m.user_id = '42' -- lawrence
and g_commu.group_data_id = '1' -- sandbox
and g_commu.group_data_type = 'communities'
and g_topic.group_data_type = 'tags'
```

g_child above would be a group without its own group data object, meaningful
only because it's the child of gc_commu and gc_topic. we could call this an
"intersection group"?

### cleanup

If this works out as desired, we should be able to drop the following tables
(after migrating their data of course):

* comments_tags
* communities.network_id
* communities_posts
* communities_tags
* communities_users
* follows
* networks_posts
* networks_users
* posts_tags
* posts_users
* tag_follows

## alternate approach?

keep the DB schema as-is and just have a common API in the code that maps to the
underlying tables correctly?

## would be nice...

upgrade knex to 0.14 to get better syntax for table aliasing -- but that will
require an upgraded version of mock-knex that doesn't yet exist (or rewriting a
test file to not use it, and removing it), as well as an upgraded version of
bookshelf and testing around that.
