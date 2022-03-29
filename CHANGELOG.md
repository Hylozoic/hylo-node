# Changelog
All notable changes to Hylo Node (the Hylo server) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

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
