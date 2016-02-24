module.exports = function (req, res, next) {
  Project.find(req.param('projectId'))
  .then(project => {
    var pass = () => {
      res.locals.project = project
      next()
    }

    var fail = (log, responseType) => {
      sails.log.debug('policy: checkAndSetProject: ' + log)
      res[responseType || 'forbidden']()
    }

    var checkProjectMembership = function (passed) {
      if (passed) return Promise.resolve(true)

      return ProjectMembership.find(req.session.userId, project.id)
        .then(membership => !!membership)
    }

    var checkInvitation = function (passed) {
      if (passed) return true

      if (req.param('token')) {
        return ProjectInvitation.validate(project.id, req.param('token'))
      }

      if (req.session.userId) {
        // the token is not present but there is a valid invitation, i.e.
        // the invited user went directly to the project page
        return ProjectInvitation.forUser(req.session.userId, project.id)
          .fetch().then(invitation => !!invitation)
      }
    }

    if (!project) {
      fail('no project', 'notFound')
    } else if (Admin.isSignedIn(req)) {
      pass()
    } else if (req.session.userId === project.get('user_id')) {
      // you're the creator
      pass()
    } else if (project.isDraft()) {
      checkProjectMembership(false)
      .then(checkInvitation)
      .then(passed => passed ? pass() : fail('no access to draft'))
    } else if (project.isPublic()) {
      // it's published and public
      pass()
    } else {
      // it's a published community project
      Membership.find(req.session.userId, project.get('community_id'))
      .then(membership => !!membership)
      .then(checkProjectMembership)
      .then(checkInvitation)
      .then(passed => passed ? pass() : fail('no access to community project'))
    }
  })
  .catch(res.serverError.bind(res))
}
