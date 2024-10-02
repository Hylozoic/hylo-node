# Changelog
All notable changes to Hylo Node (the Hylo server) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

## [5.10.0] - 2024-10-02

### Added
- Community Moderation version 1: When flagging an innapropriate post or comment, you are now required to say why you flagged it, and connect it with one or more group or platfom agreements that it violates. Moderated posts are blurred out in the stream. Moderators are notified and can decide whether to clear the flag or delete the post, or leave it blurred. Moderation decisions are logged under Decisions -> Moderation.

## [5.9.1] - 2024-09-19

### Added
- Track editedAt timestamp for posts and comments

### Changed
- New users have the default notification setting of all posts, meaning they will now receive notifications for all posts in groups they are a member of, instead of just important ones.

## [5.9.0] - 2024-07-23

### Added
- __More powerful Roles & Responsibilities__: Groups can now have roles that have specific responsibilities, and members can have multiple roles in a group. Roles can be assigned to members by group Coordinators (described below). There are 4 built in System responsibilities: Administration (super admin that can do everything and change all group settings), Manage Content (can remove posts from the group, and edit the Explore page), Remove Members (boot members from the group), and Add Members (full access to the invite and join request functionality for the group).  There are also 3 built in Common Roles that all groups have: Coordinators have full Administration powers, Moderators can Manage Content and Remove Members, and Hosts can Add Members. Groups can also add custom roles with custom responsibilities defined by the group, or custom roles that include the system responsibilities.

## [5.8.0] - 2024-07-03

### Added
- New post type: Proposals! Use these to propose ideas, projects, decisions, or anything else to your group. Proposals can be voted on, and have a status that can be updated by the proposer.

### Fixed
- Deleting user accounts

## [5.7.1] - 2024-02-20

## Added
- New setting to receive a notification for every post in your groups. This is set to only receive "important" post notifications by default, which includes Announcement posts, and posts you are mentioned in. You can change the setting to All posts or None in the Notifications settings page.

## [5.7.0] - 2024-02-05

### Added
- Group Agreements: Groups can now have agreements that members must agree to when joining the group. Each agreement has a title and description, and newly joining members must agree to them before they are let in. If agreements change then the member will be asked to agree to the newly changed agreeements.
- You can now require Join Questions for Groups that are set to Accessibility = Closed or Open, no longer just for Restricted groups

### Changed
- When inviting someone to a group that has Join Questions new members are now asked to answer the join questions before being let in to the group even when invited by join link or email address.

### Fixed
- Bug that allowed people to message someone they don't share a group with.

## [5.6.2] - 2023-12-29

### Changed
- oAuth refresh tokens last 180 days instead of 14 days

### Fixed
- Bug that was preventing direct message email notifications from going out

## [5.6.1] - 2023-11-11

### Changed
- Notifications for new chats take you to the chat room on mobile, scrolled to that post, instead of opening the post itself
- Turn off ability for new groups to to be able to post in public and appear in the Group Explorer. In the future groups will have to apply to be able to post in public. This is a temporary measure to prevent spam.
- Improve performance by loading event invites only for events and post members only for projects
- For post related Zapier triggers set the post URL to be the post in the first group it is in, instead of in the "all" groups context. Normally this is what people will want, to see the post in its group context.

### Fixed
- Fix bug that broke notifications when dealing with a post that somehow doesn't have a group (still have to figure out why that can happen)
- "Null" post time in notification emails for posts that dont have a start time.
- Don't sort pinned posts first when getting posts for chat rooms

## [5.6.0] - 2023-09-23

### Added
- Purpose field for groups. This is a free form text field that can be used to describe the group's purpose, mission, vision, etc.

## [5.5.4] - 2023-09-19

### Added
- Ability to change notification settings and unsubscribe from all notifications from links in emails that still work even when not logged in. Uses special JWT tokens for this that only allow for fetching and updating the user's notification settings.

### Fixed
- Person query to return the right user when searching by email

## [5.5.3] - 2023-08-09

### Fixed
- Show timezone for events in digest emails and announcement emails, for now always display in the time zone of the event creator
- Ensure you can't double upvote on posts with the same reaction
- Notifications related to groups joining other groups

## [5.5.2] - 2023-06-12

### Fixed
- Pinned posts from child groups appearing at the top of streams when viewing parent groups

## [5.5.1] - 2023-05-23

### Added
- Mixpanel tracking when a new member joins a group any which way

### Fixed
- Filtering of public map by a specific group

## [5.5.0] - 2023-05-12

### Added
- Initial internationalization support, and translations of emails and notifications into Spanish

## [5.4.1] - 2023-04-11

### Added
- Track locale in user settings

### Changed
- Improved API docs

## [5.4.0] - 2023-03-15

### Changed
- Finished backend and APIs for group roles and badges

## [5.3.6] - 2023-03-04

### Added
- New product categories for farms: grains, other_row_crops

## [5.3.5] - 2023-02-26

### Added
- Zapier trigger when new posts are created

### Changed
- Zapier triggers can now be setup to track (work with) more than one group at a time
- Send more data with all zapier triggers, like group URLs and profile URLs

## [5.3.4] - 2023-02-14

### Changed
- Pinned posts now appear first in every context they are visible and regardless of the sort

## [5.3.3] - 2023-02-09

### Added
- sortby and offset parameters to me.groups queries

### Changed
- me.groups returns Group objects now, not Memberships
- Change name of zapier trigger leaves_group to member_leaves

## [5.3.2] - 2023-02-05

### Changed
- Tweak fields sent to zapier triggers for users/members

### Fixed
- Fix oAuth authorization code flow

## [5.3.1] - 2023-02-01

### Fixed
- Link previews for unlisted youtube videos without descriptions
- Creating posts on mobile app

## [5.3.0] - 2023-01-30

### Added
- Support for oAuth Authorization Code flow, to enable full API integrations with other apps!
- Initial Zapier triggers: When a member is added to a group, when a member leaves or is removed from a group, when a member of a group updates their profile information.
- Database tables for GroupRole and MemberRole to support adding roles or badges to group members.

## [5.2.1] - 2023-01-20

### Changed
- Links from comment notification emails go to the first group of the post
- Adds extra CSS class for mentioned current user

### Fixed
- All notifications work with chat posts - showing chat content instead of trying to show empty post title
- Comment digest emails now link to the right comment

## [5.2.0] - 2023-01-11

### Added
- Queries for My Home views - my posts, mentions, announcements, posts I've interacted with

### Changed
- Update product categories for farms to have Other option
- Improved Saved Search email digests
- Push notifications now should jump directly to the comment they refer to

### Fixed
- Bug preventing email digests from going out

## [5.1.2] - 2022-12-29

### Fixed
- Comment notification emails for comments on chat posts (posts without a title). This hopefully also fixes issue where people were seeing duplicate comment notification emails about the same comments.

## [5.1.1] - 2022-12-23

### Fixed
- Display of public group pages to non logged in users

## [5.1.0] - 2022-12-21

### Added
- New 'chat' type posts for topic based chat rooms.
- Track the last read post in a topic for each user so we can show new posts in the new topic based chat rooms.
- Switch from votes to emoji based reactions on posts (votes APIs still in place to support mobile app).
- Add reactions to comments.
- Add a #general topic to all groups which is set to be a suggested/default topic and pinned as well. Subscribe all users to the #general topic in every group they are a part of.
- APIs to decide whether to show child posts in the stream when looking at a group or not.
- New comment URL that allows for going directly to a comment in a post from a notification.

### Changed
- Updated digest emails to show chats and improve Sender and Subject. Also switch reply-to email to donotreply@hylo.com.
- Allow for posts without a title, for chat posts only for now.

## [5.0.3] - 2022-11-23

### Fixed
- Don't send emails or push notifications for Announcements when notifications are turned off in a group
- Bug that prevented saving group settings sometimes

## [5.0.2] - 2022-11-13

### Added
- New allow_in_public flag on groups that determines whether the group appears in the Group Explorer and whether posts from that group are allowed in the public stream. This flag is turned off for new groups by default while we figure out our strategy for deciding whether it should be on or off for any given group.
- Every new group has a #general topic added to it as a default topic. This will be more important/useful when topic based chat rooms are released soon!

### Fixed
- Update `hylo-shared` to fix bug in Mention HTMl generation
- Autolinking (links being turned into clickable links) in Group descriptions is turned back on
- Can set group settings when creating a group via API. This fixes an issue where the group's locationDisplayPrecision was not being set correctly.

## [5.0.1] - 2022-10-24

### Fixed
- Update `hylo-shared` to fix bug in Mention HTMl generation

## [5.0.0] - 2022-10-24

### Added
- `Post#LinkPreviewFeatured` to indicate if a `LinkPreview` should be given precedence in the UI when displaying post
- All parsing of `Post#details` and `Comment#text` HTML is now handled here and nowhere else, moving and refactoring `presentHTML` from `hylo-shared` to support new TipTap editor formatting, and consolidating similar functions from `hylo-evo` all and here all into `RichText`
- Support for Post "Collections" which are a curated set of posts. New `collections` and `collections_posts` tables.
- CustomViews can now be of type 'collection' and point to a collection_id. When this is the case the Collection name will always be the same as the CustomView.
- CustomViews can now have a default sort specified.
- Much better inline documentation of our GraphQL APIs using Graphiql or other graphql doc viewers.

### Changed
- Updates `LinkPreview` scrapping to be more rich and somewhat more reliable
- Updates all notification email and push notifications to work with new `RichText` handling, fixing/improving some results
- Deprecates use of `linkifyjs` for `autolinker` for link recognition in HTML, and `cheerio` for `jsdom` for parsing
- Replace 'express-graphql' library with 'graphql-yoga'. Back-end errors are now returned to the front-end with generic text of 'Unknown Error', except when explicitly specified in the back-end by throwing a GraphQLYogaError object.

## [4.2.1] - 2022-08-25

### Added
- If a group is created with a parent group that it can't join then send a request to join

### Fixed
- Bug that was preventing email notifications going out for requests to join a child to a parent group.

## [4.2.0] - 2022-08-19

### Added
- Add, delete and update Custom Views for groups that can either be a link to an external URL or a filtered view of posts in a group
- Project management link and Donations link added to posts (only used for projects right now)
- Query for non-logged in users to be able to look up public posts

### Fixed
- Bugs that could unset a location or area polygon when saving settings

## [4.1.5] - 2022-07-05

### Fixed
- Saving of groups with empty group shapes

## [4.1.4] - 2022-06-20

### Fixed
- Groups not displaying when they don't have a location but location obfuscation is set to something other than Precise

## [4.1.3] - 2022-06-15

### Added
-  Can update groupExtenions when updating a group

### Changed
- New collaboration for farms

## [4.1.2] - 2022-06-08

### Added
- Add user id to member export CSV
- Add role parameter to createUser api call
- New API call addMember to add person to a group
- Group type can be set when creating a group

### Fixed
- Return groups that match a bounding box if they have a geoShape but no location
- Geocoding of locations when only a location string is passed in to create a group

## [4.1.1] - 2022-05-26

### Added
- Script to seed demo farm data

## [4.1.0] - 2022-05-24
### Added
- Location obfuscation setting for groups that can be set to precise (return exact location), near (return location offset by a slight amount and location string only shows city, region, country) or region (don't return a location object at all, and location string shows only city, region, country). Group moderators always see the precise location and location display string.
- New field on group to store an About Video URI
- New API calls for querying a group or a user and updating a group
- User setting to track which map base a layer a user has most recently used
- When a group has a location string set without a location_id we geocode the location string on the back-end and create a location object. This is primarily for groups created via API.

## [4.0.0] - 2022-04-28
### Added
- Hylo is now an OAuth 2.0 / OpenID Connect provider! This means you can add Sign in With Hylo to your website.
- Methods for adding users and groups via OAuth based API.
- Graphql endpoints for login and other auth-related features
- Login by JWT route POST route without redirect for XHR requests
- moderator_descriptor and type_descriptor columns (and plural version) to Group to customize the name of "moderators" and of how the group is described.
- Group setting to hide "extension data", meaning the extra JSON data stored for a custom group type like farm.

## [3.2.0] - 2022-03-28
### Added
- Setup for group types
- Back-end for farm type groups
- Widgets to group profile/about pages

### Fixed
- Make sure notifications are turned on for creator of a new group

### Changed
- Update group num_members in 10 minute cron job so it stays up to date and can be used by the front-end as Group.memberCount again

## [3.1.4] - 2022-03-08

### Changed
- Move HTML sanitization exclusively of posts.details and comments.text to model getters (`Post#details()` and `Comment.text()`) which should be used EXCLUSIVELY for any output through API
- Removes extraneous and destructive HTML sanitization on plain text fields (entity decoding and protection from related React text renders)
- Adopts graphql-tools default getters for Post model to reduce duplication of code and make model results canonical for sanitization
- Move from deprecated `hylo-utils` to new `hylo-shared` library

## [3.1.3] - 2022-02-22

### Added
- Location to group search fields
- Ability to search for groups by distance from a coordinate
- Ability to query posts by whether they are fulfilled or not
- Ability to query posts by multiple types or topics at once

### Changed
- Saved search finds last post id on creation so front-end doesn't need to pass it in

## [3.1.2] - 2022-01-24
### Changed
- Update to node 16 and Heroku-20

## [3.1.1] - 2022-01-04
### Fixed
- Issue with deleting when user has used mobile app

## [3.1.0] - 2021-12-17
### Added
- New signup/registration flow that includes email verification, password confirmation and in general better security practices
- Make it possible for people to deactivate or delete their account

## [3.0.8] - 2021-10-26
### Added
- Display dates for events in email notifications

### Changed
- When someone changes their password log out all other sessions for that user
- When someone logs in or signs up reset their session token to address session fixation

### Fixed
- Resetting of unread counts when viewing a group and a topic

## [3.0.7] - 2021-10-20
### Added
- Add additional valid hosts for sockets config to accomodate mobile

## [3.0.6] - 2021-10-11
### Added
- Handle image EXIF rotation data

### Fixed
- Redis connection errors

## [3.0.5] - 2021-08-31
### Changed
- Exporting group data now happens in a background worker and is sent to user by email.
- Exported group data now breaks out join questions into individual columns in the CSV.

### Fixed
- Fixed export of Twitter Name in group data export
- When looking up a chat thread with multiple people make sure to find any existing thread with those same people. So that when creating a group chat we pull up the previous chats with that same group instead of creating a new chat thread.
- Correctly track unread message count on chat threads.
- Correcly track new unread post counts/bubbles for groups in navigation drawer.

## [3.0.4] - 2021-08-04
### Changed
- Replaced isFuture filter on posts with afterTime and beforeTime

## [3.0.3] - 2021-07-08
### Added
- Enable cookies to work when Hylo is embedded in an iFrame
- Support local development with SSL
- Support isFuture parameter when loading a group's viewPosts which includes posts from child groups

## [3.0.2] - 2021-04-30
### Fixed
- Post URLs in emails

## [3.0.1] - 2021-04-21
### Fixed
- For open requests and offers widget on grop landing page don't show posts past their end time

## [3.0.0] - 2021-04-16
### Added
- __New group home page__: Add queries to support new group landing page with customizable widgets that show announcements, recent posts, open requests and offers, upcoming events, recently active projects, recenty active members, sub-groups, and a customizable welcome message.
- __Prerequisite group__: Adding these to a group means the prerequisite groups have to be joined by a user before they can join the original group.
- __Group to Group Join Questions__: Groups can have join questions for when a group is requesting to join it.
- Remember the current user's settings for the stream across sessions.
- Export member directory for a Group to a CSV.
- Suggested skills & interests for a group that can be setup by a group moderator.
- Setting to track whether a user has seen a group's join form or not, when they come through an invitation they have not.
- Tracking when users were last active on the platform.

## [2.0.2] - 2021-04-08
### Fixed
- Fixed issues saving and viewing Saved Searches on the map
- Fixed daily email digests

## [2.0.1] - 2021-04-07
### Fixed
- Loading of current user's pending join requests

## [2.0.0] - 2021-04-02
### Added
- __Holonic Architecture__: You can now add infinitely nested groups within groups within groups. And groups can have multiple "parent groups" too.
- People can see groups that they are a member of, or that are public, or that are a parent group of a group they are a member of, or are a child group of a group they are a member of unless the child group has set itself as "Hidden"
- Looking at a group's stream will show you all the posts to that group + all the posts to any descendant groups that you are also a member of (this feature temporarily disabled)
- When looking at the map for a group you will see the group itself on the map plus all descendant groups
- __Group relationship invites/requests__: Groups can request to join other groups or invigte a group to join them, and these invites/requests can be canceled, accepted or rejected by moderators of the other group.
- __Join questions__: groups can now have questions that must be answered when a person is requesting to join the group
- People can cancel their request to join a group
- Comments can be nested undearneath other comments

### Changed
- Networks with communities in them have been converted into Groups with Sub-groups inside them

### Fixes
- Show posts in the public stream for new users that have no groups
- Fix comment count on posts
- All My Groups post stream no longer shows public posts from groups you are a not a member of

## [1.4.7] - 2021-02-01
### Fixes
- People incorrectly showing as a moderator when viewing a community

## [1.4.6] - 2021-01-31
### Fixes
- Redirect URL corrected for password reset

## [1.4.5] - 2021-01-12
### Added
- URL is not required for affiliations
- Docker environment setup option and instructions

## [1.4.4]
### Added
- Add eventsAttending to the User model and Person type
- Add user_affiliations table, model for Affiliation, and mutation resolvers to createAffiliation and deleteAffiliation

## [1.4.3]
### Added
- Add Skills to learn to users

## [1.4.2]
### Fixed
- Fixed bug that prevented daily email digests from being sent

### Added
- Add projects to the User model and Person type

## [1.4.1]
### Fixed
- Fixed bug that broke the Community invite page pending invites and the invite link

## [1.4.0]
### Changed
- Catch-up tests
- Upgrade knex and bookshelf to latest versions including required updates to other dependencies
- Update code for breaking API changes in knex and bookshelf upgrades

### Fixed
- CircleCI test running
- Uploading images and don't destroy them when editing a comment

## [1.3.8]
### Added
- Ability to sort posts by created_at date

### Fixed
- Correct URL for access to user avatar images from Facebook
- Try increasing knex connection pool size to fix server timeouts

## [1.3.7]
### Added
- Add migrations, models, resolvers, and GraphQL schema changes for creating, deleting, and viewing saved searches
- Add digest for saved searches

## Fixed
- Member Profile > Recent Activity feed loading fixed

## [1.3.6]
### Added
- Adds contactEmail and contactPhone to User and related graphql

### Fixed
- Updates Passport Google Auth scheme to latest

## [1.3.5] - 2020-09-12
### Changed
- Do less database queries when loading posts to speed things up

## [1.3.4] - 2020-08-27
### Fixed
- Anyone can see comments on public posts

## [1.3.3] - 2020-08-25
### Added
- Session endpoint for support of "Sign in with Apple"

## [1.3.2] - 2020-08-19
### Added
- Beta version of importing posts by CSV

## [1.3.1] - 2020-08-17
### Added
- Allow for querying for public posts and communities without being an authenticated user

## [1.3.0] - 2020-08-14
### Added
- Join Requests: Ability to create a join request, and for admins to accept or reject join requests. Notify admins about incoming join requests and users when their request was accepted.
- Topics: Support for default, pinned and hiding CommunityTopics. Can show topics for networks and all communities.
- Comment Attachments: images and files can now be attached to comments.

### Changed
- Remove location requirement for resource posts.
