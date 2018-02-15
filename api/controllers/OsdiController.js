import osdiQuery from '../../lib/osdi/osdi-query'

const MESSAGE_OF_THE_DAY = 'Welcome to the Hylo OSDI API Entry Point'
const VENDOR_NAME        = 'Hylo, Inc'
const PRODUCT_NAME       = 'Hylo'
const OSDI_VERSION       = '1.2.0'
const DEFAULT_PAGESIZE   = 25
const MAX_PAGESIZE       = 100
const NAMESPACE          = 'hylo'

// TODO replace 'hylo.com' with domain of this instance
const ENTRY_POINT_RESPONSE = {
  motd: MESSAGE_OF_THE_DAY,
  vendor_name: VENDOR_NAME,
  product_name: PRODUCT_NAME,
  osdi_version: OSDI_VERSION,
  max_pagesize: MAX_PAGESIZE,
  namespace: NAMESPACE,
  _links: {
    'curies': [
      {
        name: 'osdi',
        href: 'https://hylo.com/docs/v1/{rel}',
        templated: true
      }
    ],
    'self': {
      href: 'https://hylo.com/api/v1',
      title: 'This API entry point'
    },
    'osdi:people': {
      href: 'https://hylo.com/api/v1/people',
      title: 'The collection of people in the system'
    },
    'osdi:person_signup_helper': {
      href: 'https://hylo.com/api/v1/people/person_signup',
      title: 'The person signup helper for the system'
    },
    'docs': {
      href: 'https://hylo.com/docs/v1/',
      title: 'Documentation',
      name: 'Docs',
      index: 'index'
    }
  }
}

module.exports = {
  entry: function (req, res) {
    res.ok(ENTRY_POINT_RESPONSE)
  },
  createPerson: function (req, res) {
    // check for valid person input data
    // create person in DB
    // send response
  },
  getPeople: function (req, res) {
    // TODO: ensure that filter is entirely valid
    const filter = req.query.filter
    const pageSize = req.query.per_page || DEFAULT_PAGESIZE
    const page = req.query.page || 1
    User
      .query(filter ? osdiQuery(filter) : () => {})
      .fetchPage({
        pageSize,
        page
      })
      .then(users => {
        // convert users to hal+json
        console.log(users.pagination)
        res.send(users.toArray())
      })
      .catch(function(err) {
        res.send(err)
      })
  },
  getPerson: function (req, res) {
    // get user id
    // get user by user id
    // convert user to model to hal+json
    // respond with 200 + json
    // or 404 error
  },
  updatePerson: function (req, res) {
    // check for valid person input data
    // update person with new data
    // send response
  },
  deletePerson: function (req, res) {
    // get user id
    // delete person by user id (mark as inactive?)
  },
  personSignupHelper: function (req, res) {

  }
}
