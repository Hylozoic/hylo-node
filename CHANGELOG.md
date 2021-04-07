# Changelog
All notable changes to Hylo Node (the Hylo server) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
