# Authenticated APIs

We have recently launched our MVP of APIs to be used by partners. Currently you have to contact us at hello@hylo.com if you want access to the APIs. We will give you an API key and secret manually.

# API calls

### Authenticate
Before making any API calls you must get an auth token

`POST to https://hylo.com/noo/oauth/token`

__Headers:__
Content-Type: application/x-www-form-urlencoded

__Parameters (all required):__
- grant_type = client_credentials
- resource = the server URL you are making the call to (e.g. https://hylo.com, https://staging.hylo.com, or https://localhost:3000)
- scope = api:write
- client_id =  YOUR_ID
- client_secret = YOUR_SECRET

This call will return an Auth Token for use in later API calls. This token will expire in 2 hours at which point you will need to make another API call to get a new Auth Token (AUTH_TOKEN).

For every subsequent API you will need to authorize by passing this token as Bearer Token in the Authorization Header:
`Authorization: Bearer AUTH_TOKEN`

### Create a User

`POST to https://hylo.com/noo/user`

__Headers:__
Content-Type: application/x-www-form-urlencoded

__Parameters:__
- name (required) = Judy Mangrove
- email (required) = email@email.com
- groupId (optional) = the id of a group to add the user to

__Return value__:

On success this will return a JSON object that looks like:
```
{
    "id": "44692",
    "name": "Judy Mangrove",
    "email": "email@email.com"
}
```

If there is already a user with this email registered you will receive:
`{ "message": "User already exists" }`


### Create a Group

`POST to https://hylo.com/noo/graphql`

__Headers:__
Content-Type: application/json

This is a GraphQL based endpoint so you will want the pass in a raw POST data
Example GraphQL mutation:
```
{
  "query": "mutation ($data: GroupInput, $asUserId: ID) { createGroup(data: $data, asUserId: $asUserId) { id name slug } }",
  "variables": {
    "data": {
      "accessibility": 1,
      "name": "Test Group",
      "slug": "unique-url-slug",
      "parentIds": [],
      "visibility": 1,
      "groupExtensions": [
          {
              "type": "farm-onboarding",
              "data": {
                  "farm_email": "test@farm.org"
              }
          }
      ]
    },
    "asUserId": USER_ID
  }
}
```

### Update a Group

`POST to https://hylo.com/noo/graphql`

__Headers:__
Content-Type: application/json

This is a GraphQL based endpoint so you will want the pass in a raw POST data
Example GraphQL mutation:
```
{
  "query": "mutation ($id: ID, $changes: GroupInput, $asUserId: ID) { updateGroup(id: $id, changes: $changes, asUserId: $asUserId) { id name slug } }",
  "variables": {
    "id": GROUP_ID,
    "changes": {
      "name": "New Name"
    },
    "asUserId": USER_ID
  }
}
```

### Query a Group

`POST to https://hylo.com/noo/graphql`

__Headers:__
Content-Type: application/json

This is a GraphQL based endpoint so you will want the pass in a raw POST data
Example GraphQL query:
NOTE: you will want to pass _either_ a slug _or_ an id to query by. If you pass both only the slug will be used to lookup the group.
```
{
  "query": "query ($id: ID, $slug: String) { group(id: $id, slug: $slug) { id name slug members { id name hasRegistered } } }",
  "variables": {
    "slug": "GROUP_SLUG"
    "id": GROUP_ID
  }
}
```

### Query a Person

`POST to https://hylo.com/noo/graphql`

__Headers:__
Content-Type: application/json

This is a GraphQL based endpoint so you will want the pass in a raw POST data
Example GraphQL query:
NOTE: you will want to pass _either_ an email _or_ an id to query by. If you pass both only the email will be used to lookup the person.
```
{
  "query": "query ($id: ID, $email: String) { person(id: $id, email: $email) { id name hasRegistered } }",
  "variables": {
    "email": "test@hello.com"
    "id": PERSON_ID
  }
}
```
