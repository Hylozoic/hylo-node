## schema

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
* Basic belonging (e.g. show up in member list)
* Special privileges (e.g. moderation)
* Subscription/notification settings
* Activity data (e.g. last read timestamp)

Relationship between a group and a parent group:
* Basic belonging
* Special settings (e.g. a community is hidden from the network)

The basic directionality of GroupConnection is that one group contains the other
group, right? We would want to have constraints so that when you have a relation
between a network and a community, say, the network id is always parent_group_id
and the community_id is always child_group_id.

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

Given the above, how do we efficiently select subsets of all child groups of a
network based on type? i.e. all posts or all communities.
Join group_connections to groups to read group_data_type, I guess.

If this works out as desired, we should be able to drop the following tables
(after migrating their data of course):

* comments_tags
* communities_tags
* communities_users
* follows
* networks_posts
* networks_users
* posts_tags
* posts_users
* tag_follows
* tags_users

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
