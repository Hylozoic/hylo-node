import { camelCase, mapKeys, startCase } from 'lodash/fp'
import pluralize from 'pluralize'
import searchQuerySet from './searchQuerySet'
import {
  commentFilter,
  groupFilter,
  groupTopicFilter,
  makeFilterToggle,
  membershipFilter,
  messageFilter,
  personFilter,
  postFilter,
  reactionFilter
} from './filters'
import { LOCATION_DISPLAY_PRECISION } from '../../lib/constants'
import InvitationService from '../services/InvitationService'
import {
  filterAndSortPosts,
  filterAndSortUsers
} from '../services/Search/util'

// this defines what subset of attributes and relations in each Bookshelf model
// should be exposed through GraphQL, and what query filters should be applied
// based on the current user's access rights.
//
// keys in the returned object are GraphQL schema type names
//
export default function makeModels (userId, isAdmin, apiClient) {
  const nonAdminFilter = makeFilterToggle(!isAdmin)

  // XXX: for now give super API users more access, in the future track which groups each client can access
  const apiFilter = makeFilterToggle(!apiClient || !apiClient.super)

  return {
    Agreement: {
      model: Agreement,
      isDefaultTypeForTable: true,
      attributes: [
        'id',
        'description',
        'order',
        'title'
      ],
      getters: {
        order: a => a.pivot && a.pivot.get('order')
      }
    },

    CommonRole: {
      model: CommonRole,
      attributes: [
        'id',
        'name',
        'description',
        'emoji'
      ],
      relations: [
        { responsibilities: { querySet: true } }
      ],
      fetchMany: () => CommonRole.fetchAll()
    },

    Me: {
      model: User,
      attributes: [
        'id',
        'avatar_url',
        'banner_url',
        'bio',
        'email',
        'contact_email',
        'contact_phone',
        'email_validated',
        'hasRegistered',
        'intercomHash',
        'linkedin_url',
        'location',
        'facebook_url',
        'name',
        'new_notification_count',
        'tagline',
        'twitter_name',
        'updated_at',
        'url'
      ],
      relations: [
        'groups',
        'memberships',
        'posts',
        'locationObject',
        { groupRoles: { querySet: true } },
        { affiliations: { querySet: true } },
        { groupInvitesPending: { querySet: true } },
        {
          joinRequests: {
            querySet: true,
            filter: (relation, { status }) =>
              relation.query(q => {
                if (typeof status !== 'undefined') {
                  q.where('status', status)
                }
              })
          }
        },
        { skills: { querySet: true } },
        { skillsToLearn: { querySet: true } },
        {
          membershipCommonRoles: {
            querySet: true,
            filter: (relation, { groupId }) => {
              return relation.query(q => {
                if (groupId) {
                  q.where('group_id', groupId)
                }
              })
            }
          }
        },
        { messageThreads: { typename: 'MessageThread', querySet: true } }
      ],
      getters: {
        blockedUsers: u => u.blockedUsers().fetch(),
        hasStripeAccount: u => u.hasStripeAccount(),
        isAdmin: () => isAdmin || false,
        settings: u => mapKeys(camelCase, u.get('settings'))
      }
    },

    Membership: {
      model: GroupMembership,
      attributes: [
        'created_at',
        'group_id'
      ],
      relations: [
        { agreements: { querySet: true } },
        { group: { alias: 'group' } },
        { user: { alias: 'person' } },
        { commonRoles: { querySet: true } },
        { membershipCommonRoles: { querySet: true } },
        { joinQuestionAnswers: { querySet: true } }
      ],
      getters: {
        settings: m => mapKeys(camelCase, m.get('settings')),
        lastViewedAt: m =>
          m.get('user_id') === userId ? m.getSetting('lastReadAt') : null,
        newPostCount: m =>
          m.get('user_id') === userId ? m.get('new_post_count') : null,
        hasModeratorRole: m => m.hasRole(GroupMembership.Role.MODERATOR) // TODO RESP: verify
      },
      filter: nonAdminFilter(membershipFilter(userId))
    },

    MembershipAgreement: {
      model: Agreement,
      attributes: [
        'id',
        'accepted'
      ],
      getters: {
        accepted: a => a.pivot && a.pivot.get('accepted')
      }
    },

    MembershipCommonRole: {
      model: MemberCommonRole,
      attributes: [
        'id',
        'group_id',
        'common_role_id',
        'user_id'
      ],
      relations: [
        'commonRole',
        'group',
        'user'
      ],
      getters: {
        roleId: mcr => mcr.get('common_role_id')
      }
    },

    MembershipGroupRole: {
      model: MemberGroupRole,
      attributes: [
        'id',
        'group_id',
        'group_role_id',
        'user_id'
      ],
      relations: [
        'group',
        'groupRole',
        'user'
      ],
      getters: {
        roleId: mcr => mcr.get('group_role_id')
      }
    },

    ModerationAction: {
      model: ModerationAction,
      attributes: [
        'status',
        'text',
        'anonymous',
        'groupId',
        'created_at',
        'updated_at'
      ],
      relations: ['post', 'reporter', 'agreements', 'platformAgreements'],
      getters: {
        anonymous: ma => ma.get('anonymous') === 'true'
      },
      fetchMany: ({ first = 20, offset = 0, slug, sortBy }) =>
        searchQuerySet('forModerationActions', {
          first, offset, currentUserId: userId, slug, sortBy
        })
    },

    Person: {
      model: User,
      attributes: [
        'name',
        'avatar_url',
        'banner_url',
        'bio',
        'contact_email',
        'contact_phone',
        'twitter_name',
        'linkedin_url',
        'facebook_url',
        'url',
        'last_active_at',
        'location',
        'tagline'
      ],
      getters: {
        messageThreadId: p => p.getMessageThreadWith(userId).then(post => post ? post.id : null)
      },
      relations: [
        'memberships',
        {
          membershipCommonRoles: {
            querySet: true,
            filter: (relation, { groupId }) => {
              return relation.query(q => {
                if (groupId) {
                  q.where('group_id', groupId)
                }
              })
            }
          }
        },
        'moderatedGroupMemberships', // TODO: still need this?
        'locationObject',
        { groupRoles: { querySet: true } },
        { commonRoles: { querySet: true } },
        { affiliations: { querySet: true } },
        { eventsAttending: { querySet: true } },
        { posts: { querySet: true } },
        { projects: { querySet: true } },
        { comments: { querySet: true } },
        { skills: { querySet: true } },
        { skillsToLearn: { querySet: true } },
        { reactions: { querySet: true } }
      ],
      filter: nonAdminFilter(apiFilter(personFilter(userId))),
      isDefaultTypeForTable: true,
      fetchMany: ({ boundingBox, first, order, sortBy, offset, search, autocomplete, groupIds, filter }) =>
        searchQuerySet('users', {
          boundingBox,
          term: search,
          limit: first,
          offset,
          order,
          type: filter,
          autocomplete,
          groups: groupIds,
          sort: sortBy
        })
    },

    PlatformAgreement: {
      model: PlatformAgreement,
      attributes: [
        'id',
        'description',
        'text',
        'type'
      ]
    },

    Post: {
      model: Post,
      attributes: [
        'accept_contributions',
        'announcement',
        'anonymous_voting',
        'commentsTotal',
        'created_at',
        'donations_link',
        'edited_at',
        'end_time',
        'flagged_groups',
        'fulfilled_at',
        'is_public',
        'link_preview_featured',
        'location',
        'project_management_link',
        'proposal_status',
        'voting_method',
        'proposal_outcome',
        'quorum',
        'reactions_summary',
        'start_time',
        'timezone',
        'type',
        'updated_at'
      ],
      getters: {
        commenters: (p, { first }) => p.getCommenters(first, userId),
        commentersTotal: p => p.getCommentersTotal(userId),
        details: p => p.details(userId),
        isAnonymousVote: p => p.get('anonymous_voting') === 'true',
        myReactions: p => userId ? p.reactionsForUser(userId).fetch() : [],
        // clickthrough: p => p.pivot && p.pivot.get('clickthrough'), // TODO COMOD: does not seem to work
        clickthrough: p => p.checkClickthrough(userId),
        myEventResponse: p =>
          userId && p.isEvent()
            ? p.userEventInvitation(userId).then(eventInvitation => eventInvitation ? eventInvitation.get('response') : '')
            : ''
      },
      relations: [
        { comments: { querySet: true } },
        'groups',
        { user: { alias: 'creator' } },
        'followers',
        'locationObject',
        { members: { querySet: true } },
        { eventInvitations: { querySet: true } },
        { moderationActions: { querySet: true} },
        { proposalOptions: { querySet: true } },
        { proposalVotes: { querySet: true } },
        'linkPreview',
        'postMemberships',
        {
          reactions: {
            alias: 'postReactions'
          }
        },
        {
          media: {
            alias: 'attachments',
            arguments: ({ type }) => [type]
          }
        },
        { tags: { alias: 'topics' } }
      ],
      filter: postFilter(userId, isAdmin),
      isDefaultTypeForTable: true,
      fetchMany: ({
        activePostsOnly = false,
        afterTime,
        announcementsOnly,
        beforeTime,
        boundingBox,
        collectionToFilterOut,
        context,
        createdBy,
        cursor,
        filter,
        first,
        forCollection,
        groupSlugs,
        interactedWithBy,
        isFulfilled,
        mentionsOf,
        offset,
        order,
        proposalOutcome,
        proposalStatus,
        sortBy,
        search,
        topic,
        topics,
        types
      }) =>
        searchQuerySet('posts', {
          activePostsOnly,
          afterTime,
          announcementsOnly,
          beforeTime,
          boundingBox,
          collectionToFilterOut,
          currentUserId: userId,
          cursor,
          forCollection,
          groupSlugs,
          interactedWithBy,
          isFulfilled,
          limit: first,
          mentionsOf,
          offset,
          onlyMyGroups: context === 'all',
          onlyPublic: context === 'public',
          order,
          proposalOutcome,
          proposalStatus,
          sort: sortBy,
          term: search,
          topic,
          topics,
          type: filter,
          types,
          users: createdBy
        })
    },

    Group: {
      model: Group,
      attributes: [
        'about_video_uri',
        'accessibility',
        'avatar_url',
        'banner_url',
        'created_at',
        'description',
        'location',
        'geo_shape',
        'memberCount',
        'name',
        'postCount',
        'purpose',
        'slug',
        'visibility',
        'type'
      ],
      relations: [
        { activeMembers: { querySet: true } },
        { agreements: { querySet: true } },
        { childGroups: { querySet: true } },
        { customViews: { querySet: true } },
        { groupRelationshipInvitesFrom: { querySet: true } },
        { groupRelationshipInvitesTo: { querySet: true } },
        { groupRoles: { querySet: true } },
        {
          groupTags: {
            querySet: true,
            alias: 'groupTopics',
            filter: (relation, { autocomplete, subscribed }) =>
              relation.query(groupTopicFilter(userId, {
                autocomplete,
                subscribed,
                groupId: relation.relatedData.parentId
              }))
          }
        },
        { groupToGroupJoinQuestions: { querySet: true } },
        { joinQuestions: { querySet: true } },
        { moderators: { querySet: true } },
        { stewards: { querySet: true } },
        {
          memberships: {
            querySet: true,
            filter: (relation, { userId }) =>
              relation.query(q => {
                if (userId) {
                  q.where('group_memberships.user_id', userId)
                }
              })
          }
        },
        {
          members: {
            querySet: true,
            filter: (relation, { id, autocomplete, boundingBox, groupRoleId, order, search, sortBy, commonRoleId }) =>
              relation.query(filterAndSortUsers({ autocomplete, boundingBox, groupId: relation.relatedData.parentId, groupRoleId, order, search, sortBy, commonRoleId }))
          }
        },
        { parentGroups: { querySet: true } },
        {
          posts: {
            querySet: true,
            filter: (relation, {
              activePostsOnly = false,
              afterTime,
              beforeTime,
              boundingBox,
              collectionToFilterOut,
              cursor,
              forCollection,
              filter,
              isAnnouncement,
              isFulfilled,
              order,
              search,
              sortBy,
              topic,
              topics,
              types
            }) =>
              relation.query(filterAndSortPosts({
                activePostsOnly,
                afterTime,
                beforeTime,
                boundingBox,
                collectionToFilterOut,
                cursor,
                forCollection,
                isAnnouncement,
                isFulfilled,
                order,
                search,
                showPinnedFirst: true,
                sortBy,
                topic,
                topics,
                type: filter,
                types
              }))
          }
        },
        {
          prerequisiteGroups: {
            querySet: true,
            filter: (relation, { onlyNotMember }) =>
              relation.query(q => {
                if (onlyNotMember && userId) {
                  // Only return prerequisite groups that the current user is not yet a member of
                  q.whereNotIn('groups.id', GroupMembership.query().select('group_id').where({
                    'group_memberships.user_id': userId,
                    'group_memberships.active': true
                  }))
                }
              })
          }
        },
        {
          skills: {
            querySet: true,
            filter: (relation, { autocomplete }) =>
              relation.query(q => {
                if (autocomplete) {
                  q.whereRaw('skills.name ilike ?', autocomplete + '%')
                }
              })
          }
        },
        { suggestedSkills: { querySet: true } },
        {
          viewPosts: {
            querySet: true,
            arguments: () => [userId],
            filter: (relation, { activePostsOnly = false, afterTime, beforeTime, boundingBox, collectionToFilterOut, filter, forCollection, isFulfilled, order, search, sortBy, topic, topics, types }) =>
              relation.query(filterAndSortPosts({
                activePostsOnly,
                afterTime,
                beforeTime,
                boundingBox,
                collectionToFilterOut,
                forCollection,
                isFulfilled,
                order,
                search,
                showPinnedFirst: true,
                sortBy,
                topic,
                topics,
                type: filter,
                types
              }))
          }
        },
        { widgets: { querySet: true } },
        { groupExtensions: { querySet: true } }
      ],
      getters: {
        // commonRoles: async g => g.commonRoles(),
        invitePath: g =>
          GroupMembership.hasResponsibility(userId, g, Responsibility.constants.RESP_ADD_MEMBERS)
            .then(canInvite => canInvite ? Frontend.Route.invitePath(g) : null),
        location: async (g) => {
          // If location obfuscation is on then non group stewards see a display string that only includes city, region & country
          const precision = g.getSetting('location_display_precision') || LOCATION_DISPLAY_PRECISION.Precise
          if (precision === LOCATION_DISPLAY_PRECISION.Precise ||
                (userId && await GroupMembership.hasResponsibility(userId, g, Responsibility.constants.RESP_ADMINISTRATION))) {
            return g.get('location')
          } else {
            const locObj = await g.locationObject().fetch()
            if (locObj) {
              let display = locObj.get('country')
              if (locObj.get('region')) {
                display = locObj.get('region') + ', ' + display
              }
              if (locObj.get('city')) {
                display = locObj.get('city') + ', ' + display
              }
              return display
            }
          }
          return null
        },
        locationObject: async (g) => {
          // If precision is precise or user is an administrator of the group show the exact location
          const precision = g.getSetting('location_display_precision') || LOCATION_DISPLAY_PRECISION.Precise
          if (precision === LOCATION_DISPLAY_PRECISION.Precise ||
                (userId && await GroupMembership.hasResponsibility(userId, g, Responsibility.constants.RESP_ADMINISTRATION))) {
                  // TODO: add RESP for this
            return g.locationObject().fetch()
          } else if (precision === LOCATION_DISPLAY_PRECISION.Near) {
            // For near only include region, city, country columns, and move the exact location around every load
            const columns = [
              'id',
              bookshelf.knex.raw('ST_Translate(center, random()*.03 - .03, random()*.03 -.03) as center'),
              'city',
              'locality',
              'region',
              'neighborhood',
              'postcode',
              'country',
              'accuracy',
              'wikidata'
            ]
            return g.locationObject().query(q => q.select(columns)).fetch()
          } else {
            // if location display precision is "region" then don't return the location object at all
            return null
          }
        },
        // XXX: Flag for translation
        moderatorDescriptor: (g) => g.get('steward_descriptor') || 'Steward',
        moderatorDescriptorPlural: (g) => g.get('steward_descriptor_plural') || 'Stewards',
        stewardDescriptor: (g) => g.get('steward_descriptor') || 'Steward',
        stewardDescriptorPlural: (g) => g.get('steward_descriptor_plural') || 'Stewards',
        // Get number of prerequisite groups that current user is not a member of yet
        numPrerequisitesLeft: g => g.numPrerequisitesLeft(userId),
        pendingInvitations: (g, { first }) => InvitationService.find({ groupId: g.id, pendingOnly: true }),
        responsibilities: async g => g.availableResponsibilities().fetch(),
        settings: g => mapKeys(camelCase, g.get('settings')),
        // XXX: Flag for translation
        typeDescriptor: g => g.get('type_descriptor') || (g.get('type') ? startCase(g.get('type')) : 'Group'),
        typeDescriptorPlural: g => g.get('type_descriptor_plural') || (g.get('type') ? pluralize(startCase(g.get('type'))) : 'Groups')
      },
      filter: nonAdminFilter(apiFilter(groupFilter(userId))),
      fetchMany: ({ autocomplete, boundingBox, context, farmQuery, filter, first, groupIds, groupType, nearCoord, offset, onlyMine, order, parentSlugs, search, sortBy, visibility }) =>
        searchQuerySet('groups', {
          autocomplete,
          boundingBox,
          currentUserId: userId,
          farmQuery,
          groupIds,
          groupType,
          limit: first,
          nearCoord,
          offset,
          onlyMine: context === 'all',
          order,
          parentSlugs,
          sort: sortBy,
          term: search,
          type: filter,
          visibility: context === 'public' ? Group.Visibility.PUBLIC : visibility
        })
    },

    GroupJoinQuestion: {
      model: GroupJoinQuestion,
      attributes: [
        'questionId',
        'text'
      ]
    },

    GroupJoinQuestionAnswer: {
      model: GroupJoinQuestionAnswer,
      isDefaultTypeForTable: true,
      attributes: [
        'answer'
      ],
      relations: ['group', 'question', 'user']
    },

    GroupToGroupJoinQuestion: {
      model: GroupToGroupJoinQuestion,
      attributes: [
        'questionId',
        'text'
      ]
    },

    GroupRelationship: {
      model: GroupRelationship,
      attributes: [
        'created_at',
        'role',
        'updated_at'
      ],
      relations: ['childGroup', 'parentGroup']
    },

    GroupRelationshipInvite: {
      model: GroupRelationshipInvite,
      attributes: [
        'created_at',
        'status',
        'type',
        'updated_at'
      ],
      getters: {
        questionAnswers: i => i.questionAnswers().fetch()
      },
      relations: ['createdBy', 'fromGroup', 'toGroup']
    },

    GroupRole: {
      model: GroupRole,
      attributes: [
        'color',
        'emoji',
        'description',
        'group_id',
        'name',
        'active',
        'createdAt',
        'updatedAt'
      ],
      relations: [
        'group',
        { responsibilities: { querySet: true } }
      ]
    },

    CustomView: {
      model: CustomView,
      attributes: [
        'active_posts_only',
        'collection_id',
        'default_sort',
        'default_view_mode',
        'external_link',
        'group_id',
        'icon',
        'is_active',
        'name',
        'order',
        'post_types',
        'type',
        'search_text'
      ],
      relations: [
        'collection',
        'group',
        { tags: { alias: 'topics' } }
      ]
    },

    Collection: {
      model: Collection,
      attributes: [
        'created_at',
        'name',
        'updated_at'
      ],
      relations: [
        'group',
        { linkedPosts: { querySet: true } },
        { posts: { querySet: true } },
        'user'
      ]
    },

    CollectionsPost: {
      model: CollectionsPost,
      attributes: [
        'created_at',
        'order',
        'updated_at'
      ],
      relations: [
        'post',
        'user'
      ]
    },

    Invitation: {
      model: Invitation,
      attributes: [
        'id',
        'created_at',
        'email',
        'last_sent_at',
        'token'
      ],
      relations: [
        'creator',
        'group'
      ]
    },

    JoinRequest: {
      model: JoinRequest,
      attributes: [
        'created_at',
        'updated_at',
        'status'
      ],
      relations: [
        'group',
        'user'
      ],
      getters: {
        questionAnswers: jr => jr.questionAnswers().fetch()
      },
      fetchMany: ({ groupId }) => JoinRequest.where({ group_id: groupId, status: JoinRequest.STATUS.Pending })
    },

    Question: {
      model: Question,
      attributes: [
        'text'
      ]
    },

    Affiliation: {
      model: Affiliation,
      attributes: [
        'created_at',
        'updated_at',
        'role',
        'preposition',
        'org_name',
        'url',
        'is_active'
      ],
      relations: ['user']
    },

    EventInvitation: {
      model: EventInvitation,
      attributes: [
        'response'
      ],
      relations: [
        { user: { alias: 'person' } }
      ]
    },

    Comment: {
      model: Comment,
      attributes: [
        'created_at',
        'edited_at'
      ],
      relations: [
        'post',
        { user: { alias: 'creator' } },
        { childComments: { querySet: true } },
        {
          media: {
            alias: 'attachments',
            arguments: ({ type }) => [type]
          }
        }
      ],
      getters: {
        text: comment => comment.text(userId),
        parentComment: (c) => c.parentComment().fetch(),
        myReactions: c => userId ? c.reactionsForUser(userId).fetch() : [],
        commentReactions: c => c.reactions().fetch() // XXX: for some reason this doesn't work as relationship alias, I dont know why
      },
      filter: nonAdminFilter(commentFilter(userId)),
      isDefaultTypeForTable: true
    },

    LinkPreview: {
      model: LinkPreview,
      attributes: [
        'description',
        'image_url',
        'status',
        'title',
        'url'
      ]
    },

    Location: {
      model: Location,
      attributes: [
        'accuracy',
        'address_number',
        'address_street',
        'bbox',
        'center',
        'city',
        'country',
        'full_text',
        'locality',
        'neighborhood',
        'region',
        'postcode'
      ]
    },

    MessageThread: {
      model: Post,
      attributes: ['created_at', 'updated_at'],
      getters: {
        unreadCount: t => t.unreadCountForUser(userId),
        lastReadAt: t => t.lastReadAtForUser(userId)
      },
      relations: [
        { followers: { alias: 'participants' } },
        { comments: { alias: 'messages', typename: 'Message', querySet: true } }
      ],
      filter: relation => relation.query(q =>
        q.whereIn('posts.id', PostUser.followedPostIds(userId)))
    },

    Message: {
      model: Comment,
      attributes: ['created_at'],
      relations: [
        { post: { alias: 'messageThread', typename: 'MessageThread' } },
        { user: { alias: 'creator' } }
      ],
      filter: messageFilter(userId)
    },

    Reaction: {
      model: Reaction,
      getters: {
        createdAt: r => r.get('date_reacted'),
        emojiBase: r => r.get('emoji_base'),
        emojiFull: r => r.get('emoji_full'),
        emojiLabel: r => r.get('emoji_label'),
        entityId: r => r.get('entity_id'),
        entityType: r => r.get('entity_type')
      },
      isDefaultTypeForTable: true,
      relations: [
        'post',
        'user'
      ],
      filter: nonAdminFilter(reactionFilter('reactions', userId))
    },

    GroupTopic: {
      model: GroupTag,
      attributes: ['created_at', 'is_default', 'updated_at', 'visibility'],
      getters: {
        postsTotal: gt => gt.postCount(),
        followersTotal: gt => gt.followerCount(),
        isSubscribed: gt => userId ? gt.isFollowed(userId) : null,
        lastReadPostId: gt => userId ? gt.lastReadPostId(userId) : null,
        newPostCount: gt => gt.newPostCount(userId)
      },
      relations: [
        'group',
        { tag: { alias: 'topic' } }
      ],
      filter: nonAdminFilter(relation => relation.query(q => {
        q.whereIn('groups_tags.group_id', Group.selectIdsForMember(userId))
      })),
      fetchMany: args => GroupTag.query(groupTopicFilter(userId, args))
    },

    Responsibility: {
      model: Responsibility,
      attributes: [
        'id',
        'title',
        'description',
        'type'
      ]
    },

    SavedSearch: {
      model: SavedSearch,
      attributes: [
        'boundingBox',
        'group',
        'context',
        'created_at',
        'name',
        'is_active',
        'search_text',
        'post_types'
      ],
      fetchMany: ({ userId }) => SavedSearch.where({ user_id: userId, is_active: true })
    },

    Skill: {
      model: Skill,
      attributes: ['name'],
      fetchMany: ({ autocomplete, first = 1000, offset = 0 }) =>
        searchQuerySet('skills', {
          autocomplete, first, offset, currentUserId: userId
        })
    },

    Topic: {
      model: Tag,
      attributes: ['name'],
      getters: {
        postsTotal: (t, opts = {}) =>
          Tag.taggedPostCount(t.id, Object.assign({}, opts, { userId })),
        followersTotal: (t, opts = {}) =>
          Tag.followersCount(t.id, Object.assign({}, opts, { userId }))
      },
      relations: [{
        groupTags: {
          alias: 'groupTopics',
          querySet: true,
          filter: (relation, { autocomplete, subscribed, isDefault, visibility }) =>
            relation.query(groupTopicFilter(userId, {
              autocomplete,
              isDefault,
              subscribed,
              visibility
            })
            )
        }
      }],
      fetchMany: ({ groupSlug, name, isDefault, visibility, autocomplete, first, offset = 0, sortBy }) =>
        searchQuerySet('tags', { userId, groupSlug, name, autocomplete, isDefault, visibility, limit: first, offset, sort: sortBy })
    },

    Notification: {
      model: Notification,
      relations: ['activity'],
      getters: {
        createdAt: n => n.get('created_at')
      },
      fetchMany: ({ first, order, offset = 0 }) =>
        Notification.where({
          medium: Notification.MEDIUM.InApp,
          'notifications.user_id': userId
        })
          .orderBy('id', order)
      // TODO: fix this filter. Currently it filters out any notification without a comment
      // filter: (relation) => relation.query(q => {
      //   q.join('activities', 'activities.id', 'notifications.activity_id')
      //   q.join('posts', 'posts.id', 'activities.post_id')
      //   q.join('comments', 'comments.id', 'activities.comment_id')
      //   q.whereNotIn('activities.actor_id', BlockedUser.blockedFor(userId))
      //   q.whereNotIn('posts.user_id', BlockedUser.blockedFor(userId))
      //   q.whereNotIn('comments.user_id', BlockedUser.blockedFor(userId))
      // })
    },

    Activity: {
      model: Activity,
      attributes: ['meta', 'unread'],
      relations: [
        'actor',
        'post',
        'comment',
        'group',
        'otherGroup'
      ],
      getters: {
        action: a => Notification.priorityReason(a.get('meta').reasons)
      }
    },

    PersonConnection: {
      model: UserConnection,
      attributes: [
        'type',
        'created_at',
        'updated_at'
      ],
      relations: [{ otherUser: { alias: 'person' } }],
      fetchMany: () => UserConnection,
      filter: relation => {
        return relation.query(q => {
          if (userId) {
            q.whereNotIn('other_user_id', BlockedUser.blockedFor(userId))
            q.where('user_id', userId)
          }
          q.orderBy('created_at', 'desc')
        })
      }
    },

    Attachment: {
      model: Media,
      attributes: [
        'type',
        'url',
        'thumbnail_url',
        'position',
        'created_at'
      ]
    },

    PostMembership: {
      model: PostMembership,
      relations: [
        'group'
      ]
    },

    PostUser: {
      model: PostUser,
      relations: [
        'post',
        'user'
      ]
    },

    ProposalOption: {
      model: ProposalOption,
      attributes: [
        'emoji',
        'color',
        'text'
      ]
    },

    ProposalVote: {
      model: ProposalVote,
      attributes: [
        'created_at',
        'id',
        'option_id'
      ],
      relations: [
        'user'
      ]
    },

    GroupExtension: {
      model: GroupExtension,
      attributes: [
        'id',
        'active',
        'type'
      ],
      getters: {
        data: groupExtension => groupExtension.pivot && groupExtension.pivot.get('data')
      }
    },

    Extension: {
      model: Extension,
      attributes: [
        'id',
        'type'
      ]
    },

    GroupWidget: {
      model: GroupWidget,
      attributes: [
        'id',
        'is_visible',
        'name',
        'order',
        'context'
      ],
      getters: {
        settings: gw => mapKeys(camelCase, gw.get('settings'))
      },
      relations: ['group']
    },

    Widget: {
      model: Widget,
      attributes: [
        'id',
        'name'
      ]
    }
  }
}
