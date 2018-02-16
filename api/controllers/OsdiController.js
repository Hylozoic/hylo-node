import osdiQuery from '../../lib/osdi/osdi-query'

const API_VERSION = 'v1'
const API_ROUTE = '/api/' + API_VERSION

const MESSAGE_OF_THE_DAY = 'Welcome to the Hylo OSDI API Entry Point'
const VENDOR_NAME        = 'Hylo, Inc'
const PRODUCT_NAME       = 'Hylo'
const OSDI_VERSION       = '1.2.0'
const DEFAULT_PAGESIZE   = 25
const MAX_PAGESIZE       = 100
const NAMESPACE          = 'hylo'

function href(url) {
  return {
    href: url
  }
}

function personToOsdi (domain, person) {
  const p = attr => person.get(attr)
  const osdiPerson = {
    'identifiers': [
        `hylo:${p('id')}`
    ],
    'origin_system': PRODUCT_NAME,
    'created_date': p('created_at'),
    'modified_date': p('updated_at'),
    'given_name': p('first_name'), // TODO: does hylo actually USE this field?
    'family_name': p('last_name'), // TODO: does hylo actually USE this field?
    'additional_name': p('name'),
    'browser_url': p('url'),
    'email_addresses': [
        {
            'primary': true,
            'address': p('email'),
            'address_type': 'other',
            'status': 'subscribed' // TODO: this is meaningless
        }
    ],
    'profiles': [],
    'custom_fields': {
        'bio': p('bio'),
        'work': p('work'),
        'intention': p('intention'),
        'extra_info': p('extra_info'),
        'location': p('location'),
        'tagline': p('tagline'),
        'avatar_url': p('avatar_url')
    },
    '_links': {
        'self': href(`${domain}${API_ROUTE}/people/${person.get('id')}`)
    }
  }
  if (p('twitter_name')) {
    osdiPerson.profiles.push({
      provider: 'Twitter',
      handle: p('twitter_name'),
      url: 'https://twitter.com/' + p('twitter_name')
    })
  }
  if (p('linkedin_url')) {
    osdiPerson.profiles.push({
      provider: 'LinkedIn',
      url: p('linkedin_url')
    })
  }
  if (p('facebook_url')) {
    osdiPerson.profiles.push({
      provider: 'Facebook',
      url: p('facebook_url')
    })
  }
  return osdiPerson
}

module.exports = {
  entry: function (req, res) {
    const rootUrl = req.protocol + '://' + req.get('host')
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
            href: rootUrl + '/docs/v1/{rel}',
            templated: true
          }
        ],
        'self': {
          href: `${rootUrl}${API_ROUTE}`,
          title: 'This API entry point'
        },
        'osdi:people': {
          href: `${rootUrl}${API_ROUTE}/people`,
          title: 'The collection of people in the system'
        },
        'osdi:person_signup_helper': {
          href: `${rootUrl}${API_ROUTE}/people/person_signup`,
          title: 'The person signup helper for the system'
        },
        'docs': {
          href: rootUrl + '/docs/v1/',
          title: 'Documentation',
          name: 'Docs',
          index: 'index'
        }
      }
    }
    res.ok(ENTRY_POINT_RESPONSE)
  },
  createPerson: function (req, res) {
    // check for valid person input data
    // create person in DB
    // send response
  },
  getPeople: async function (req, res) {
    // TODO: ensure that filter is entirely valid
    const rootUrl = req.protocol + '://' + req.get('host')
    const filter = req.query.filter
    const pageSize = req.query.per_page || DEFAULT_PAGESIZE
    const page = req.query.page || 1
    const users = await User
      .query(filter ? osdiQuery(filter) : () => {})
      .fetchPage({
        pageSize,
        page
      })
    const { pageCount, rowCount } = users.pagination
    let nextUrl = null
    if (page < pageCount) {
      nextUrl = `${rootUrl}${API_ROUTE}/people?per_page=${pageSize}&page=${(parseInt(page, 10) + 1)}`
      if (filter) {
        nextUrl += `&filter=${filter}`
      }
    }
    const response = {
      'total_pages': pageCount,
      'per_page': pageSize,
      'page': page,
      'total_records': rowCount,
      '_links': {
        'next': href(nextUrl),
        'osdi:people': users.map(u => href(`${rootUrl}${API_ROUTE}/people/${u.get('id')}`)),
        'curies': [
          {
            'name': 'osdi',
            'href': rootUrl + '/docs/v1/{rel}',
            'templated': true
          }
        ],
        'self': href(rootUrl + req.originalUrl)
      },
      '_embedded': {
        'osdi:people': users.map(u => personToOsdi(rootUrl, u))
      }
    }
    res.send(response)
  },
  getPerson: async function (req, res) {
    const rootUrl = req.protocol + '://' + req.get('host')
    const person = await new User({id: req.params.personId}).fetch()
    if (!person) {
      return res.notFound()
    }
    res.send(personToOsdi(rootUrl, person))
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
