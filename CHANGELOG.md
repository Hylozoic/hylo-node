# Changelog
All notable changes to Hylo Node (the Hylo server) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
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