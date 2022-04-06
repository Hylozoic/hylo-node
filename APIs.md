# Authenticated APIs

We have recently launched our MVP of APIs to be used by partners. Currently you have to contact us at hello@hylo.com if you want access to the APIs. We will give you an API key and secret manually.

# API calls

### Authenticate
Before making any API calls you must get an auth token

`POST to https://hylo.com/noo/oauth/token`

__Parameters (all required):__
grant_type = client_credentials
audience = https://hylo.com
resource = https://hylo.com
scope = api:write
client_id =  YOUR_ID
client_secret = YOUR_SECRET

This call will return an Auth Token for use in later API calls. This token will expire in 2 hours at which point you will need to make another API call to get a new Auth Token (AUTH_TOKEN).

For every subsequent API you will need to authorize by passing this token as Bearer Token in the Authorization Header:
`Authorization: Bearer AUTH_TOKEN`

### Create a User

`POST to https://hylo.com/noo/user`

__Headers:__
Content-Type: application/x-www-form-urlencoded

__Parameters:__
name (required) = Judy Mangrove
email (required) = email@email.com
groupId (optional) = the id of a group to add the user to

TODO: talk about possible errors
{ "message": "User already exists" }


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
