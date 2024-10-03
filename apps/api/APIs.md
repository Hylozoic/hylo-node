# Authenticated APIs

We have recently launched our MVP of Hylo APIs that can be used by partners to interact with Hylo from third party apps. Currently you have to contact us at hello@hylo.com if you want access to the APIs. We will send you a `client_id` and `client_secret` manually. We are using the oAuth 2.0 and OpenID Connect standards to enable our API access. We primarily support the oAuth 2.0 Authorization Code flow for full API access in most app types, including web apps and natively installed apps. This requires redirecting to Hylo to get permission from a user to access Hylo as them. We also support the Client Credentials flow/grant type for server-to-server interactions that don't require interaction with a user. This allows a web service to use its own credentials, instead of impersonating a user, to authenticate when calling our APIs. We only support limited API calls for this type of connection.

## Authorization Code flow instructions
For full API access in most app types, including web apps and natively installed apps.

### Authentication
When asking us to give you a client ID and secret key you will also need to send us a list of possible redirect URLs you might use.
Then follow the standard oAuth Authorization Code flow, with the following URLs:

- Authorization URL: https://hylo.com/noo/oauth/auth
- Access Token URL: https://hylo.com/noo/oauth/token

1. First make a GET request to the Hylo Authorization URL, this is often done in a popup window, where the user will be asked to give consent to your app accessing their Hylo data.
   - URL parameters are:
     - `client_id`: the client ID given to you by us
     - `redirect_uri`: the URL to redirect to after authorization, must match exactly one of the redirect_uris you sent to us when asking for API access
     - `response_type`: `code`
     - `state` (optional): should be a randomly generated string, used to prevent XSRF attacks by making sure that the state string we send back to you is the same one you sent us.
     - `code_challenge`: required for PKCE (Proof Key for Code Exchange). Instructions for generating here: https://www.valentinog.com/blog/challenge/. We generally require PKCE, but if for some reason your system cannot work with that let us know and we can turn it off for your client.
   - `code_challenge_method`: S256 (meaning SHA256)
   - `scope`: space separated list of scopes, detailing what information (claims) you are requesting on the behalf of the user. Options are:
     - `openid`: required. indicates that the application intends to use OIDC to verify the user's identity. will return a 'sub' claim which is the user ID
     - `profile`: Returns claims that represent basic profile information for the user, including 'name', 'picture', 'updated_at', and 'website'
     - `address`: Returns the user's physical address if set.
     - `email`: returns the user's contact email if set
     - `phone`: returns the user's contact phone number if set
     - `offline_access`: should be used by applications that intend to make additional requests on behalf of the user over time, by enabling requesting of refresh tokens.
   - `prompt` (optional): set to 'consent' to always show the consent screen even if the user has already given permission to your app in the past.
   - Example Authorization request: `https://hylo.com/noo/oauth/auth?client_id=CLIENT_ID&redirect_uri=AFTER_LOGIN_REDIRECT_URI&response_type=code&state=xxzxn7h87h87h&code_challenge=wrU4wFWi_3urf1Kg--e-7WuPm5fOqyao1oGt9Tfz6iM&code_challenge_method=S256&scope=openid%20email&prompt=consent`
2. You will receive a response at the redirect_uri that looks like: `https://uri.com/redirect?state=xxzxn7h87h87h&code=4/P7q7W91a-oMsCeLvIaQm6bTrgtp7&scope=openid%20email`
3. If you passed in a state parameter your app should confirm that the state returned from the authorization call matches the state you passed to us.
4. Exchange the code received above for an access token by making a request to the Access Token URL.
   - URL parameters:
     - `code`: The authorization code that is returned from the initial request.
     - `client_id`: the client ID given to you by us
     - `client_secret`: the client_secret given to you by us
     - `redirect_uri`: the URL to redirect to with the access token, must match exactly one of the redirect_uris you sent to us when asking for API access
     - `grant_type`: `authorization_code`
   - Example access token request:

```
POST https://hylo.com/noo/oauth/token
Content-Type: application/x-www-form-urlencoded

 client_id=CLIENT_ID
 client_secret=XXXXX
 redirect_uri=REDIRECT_URI
 grant_type=authorization_code
 code_verifier=the code_verifier used to generate the code_challenge in the authorization request above
```
   - A Successful response will contain these fields in a JSON array:
     - `access_token`: A token that can be used to access the Hylo API.
     - `expires_in`: The remaining lifetime of the access token in seconds.
     - `id_token`: A JWT that contains identity information about the user.
     - `scope`: The scopes of access granted by the access_token expressed as a list of space-delimited, case-sensitive strings.
     - `token_type`: Identifies the type of token returned.
     - `refresh_token` (optional): This field is only present if the scope parameters included offline_access in the authentication request. This can be used to request a new access token when this one expires
5. Making an API call with the access token:
```
POST to https://hylo.com/noo/graphql

Headers:

'Authorization: `Bearer ${access_token}`
'Content-Type': 'application/json'
```

This is a GraphQL based endpoint so you will want to pass in raw POST data in the body.

Example GraphQL query: __Querying a Group__

NOTE: you will want to pass _either_ a slug _or_ an id to query by. If you pass both only the slug will be used to lookup the group.
```
{
  "query": "query ($id: ID, $slug: String) { group(id: $id, slug: $slug) { id name slug members { items { id name hasRegistered } } } }",
  "variables": {
    "slug": "GROUP_SLUG"
    "id": GROUP_ID
  }
}
```

Example GraphQL mutation: __Updating a Group__ (only will succeed on groups that the user is an administrator of)
```
{
  "query": "mutation ($id: ID, $changes: GroupInput) { updateGroup(id: $id, changes: $changes) { id name slug } }",
  "variables": {
    "id": GROUP_ID,
    "changes": {
      "name": "New Group Name"
    }
  }
}
```

Full GraphQL schema information can be found here: https://github.com/Hylozoic/hylo-node/blob/dev/api/graphql/schema.graphql



## Client Credentials instructions
For direct server-server to API calls, without user interaction. Here we offer a more limited set of API calls, but with some special abilities.

### Authentication
Before making any API calls you must get an auth token

`POST to https://hylo.com/noo/oauth/token`

__Headers:__
```
'Authorization: `Bearer ${access_token}`
'Content-Type': 'application/x-www-form-urlencoded'
```

__Parameters (all required):__
- `grant_type` = `client_credentials`
- `client_id` =  YOUR_ID
- `client_secret` = YOUR_SECRET
- `resource` = the server URL you are making the call to (e.g. https://hylo.com, https://staging.hylo.com, or https://localhost:3000)
- `scope` = `api:write` if you want to write data, or `api:read` if you just want to read it.

This call will return an ACCESS_TOKEN for use in later API calls. This token will expire in 2 hours at which point you will need to make another API call to get a new ACCESS_TOKEN.

For every subsequent API you will need to authorize by passing this token as Bearer Token in the Authorization Header:
`Authorization: Bearer ACCESS_TOKEN`

### Create a User

`POST to https://hylo.com/noo/user`

__Headers:__
```
'Authorization: `Bearer ${access_token}`
'Content-Type': 'application/x-www-form-urlencoded'
```

__Parameters:__
- name (required) = Judy Mangrove
- email (required) = email@email.com
- groupId (optional) = the id of a group to add the user to
- isModerator (optional) = true to add the user to the group specified by groupId as a moderator

__Return value__:

On success this will return a JSON object that looks like:
```
{
    "id": "44692",
    "name": "Judy Mangrove",
    "email": "email@email.com"
}
```

If there is already a user with this email but they are a not member of the group, this call will send them an invitation to join the group. You will receive:
`{ message: "User already exists, invite sent to group GROUP_NAME" }`

If there is already a user with this email and they are already a member of the group:
`{ message: "User already exists, and is already a member of this group" }`

If there is already a user with this email and you didn't pass in a group you will receive:
`{ message: "User already exists" }`

### Create a Group

`POST to https://hylo.com/noo/graphql`

__Headers:__
```
'Authorization: `Bearer ${access_token}`
'Content-Type': 'application/json'
```

This is a GraphQL based endpoint so you will want the pass in a raw POST data
Example GraphQL mutation:
```
{
  "query": "mutation ($data: GroupInput, $asUserId: ID) { createGroup(data: $data, asUserId: $asUserId) { id name slug } }",
  "variables": {
    "data": {
      "accessibility": 1, // 0 => closed (invite only), 1 => restricted (join request requires approval), 2 => open (anyone can instantly join)
      "description": "This is a long-form description of the group",
      "name": "Test Group",
      "slug": "unique-url-slug",
      "parentIds": [], // group-ids for any parent group of this group
      "visibility": 1, // 0 => hidden (Only members can see), 1 => protected (only members and members of networked groups can see), 2 => public (anyone can see, including external public)
      "location": "12345 Farm Street, Farmville, Iowa, 50129, USA",
      "geoShape": <valid geoJSON>,
      "groupExtensions": [
          {
              "type": "farm-onboarding",
              "data": {
                "farm_email": "test@farm.org",
                farmSchema..., // All the values from the farm schema, keys in snake_case
                "flexible: {
                  hylo: {
                    purpose: "Excellence in animal husbandry and educating folks about the role of grazing livestock in the soil cycle", // One or two sentence statement about the vision or purpose of a farm
                    at_a_glance: ["Event center", "You-pick", "Food Education", "Livestock breeder"],
                    opening_hours: "1-5 M-F, 10-6 Weekends", // String descriptor
                    open_to_public: true, // Boolean,
                    public_offerings: ["Farmstand", "Gift shop", "Farm tours", "Workshops"]
                  }
                }
              }
          }
      ],
      "stewardDescriptor": "Steward", // Default is Steward
      "stewardDescriptorPlural": "Stewards", // Default is Stewards
      "settings": {
        locationDisplayPrecision: precise, //   precise => precise location displayed, near => location text shows nearby town/city and coordinate shifted, region => location not shown on map at all and location text shows nearby city/region
        publicMemberDirectory: false, // Boolean
      },
      "type": <valid type or empty for default group type>,
      "typeDescriptor": "Ranch", // Group is the default
      "typeDescriptorPlural": "Ranches" // Groups is the default
    },
    "asUserId": <valid hylo userId>
  }
}
```

### Update a Group

`POST to https://hylo.com/noo/graphql`

__Headers:__
```
'Authorization: `Bearer ${access_token}`
'Content-Type': 'application/json'
```

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

### Add a Person to a Group

`POST to https://hylo.com/noo/graphql`

__Headers:__
```
'Authorization: `Bearer ${access_token}`
'Content-Type': 'application/json'
```

This is a GraphQL based endpoint so you will want the pass in a raw POST data
Example GraphQL mutation:
```
{
  "query": "mutation ($userId: ID, $groupId: ID, $role: Int) { addMember(userId: $userId, groupId: $groupId, role: $role) { success error } }",
  "variables": {
    "groupId": USER_ID,
    "groupId": GROUP_ID,
    "role": 0 // 0 = regular member, 1 = Moderator
  }
}
```

### Query a Group

`POST to https://hylo.com/noo/graphql`

__Headers:__
```
'Authorization: `Bearer ${access_token}`
'Content-Type': 'application/json'
```

This is a GraphQL based endpoint so you will want the pass in a raw POST data
Example GraphQL query:
NOTE: you will want to pass _either_ a slug _or_ an id to query by. If you pass both only the slug will be used to lookup the group.
```
{
  "query": "query ($id: ID, $slug: String) { group(id: $id, slug: $slug) { id name slug members { items { id name hasRegistered } } } }",
  "variables": {
    "slug": "GROUP_SLUG"
    "id": GROUP_ID
  }
}
```

### Query a Person

`POST to https://hylo.com/noo/graphql`

__Headers:__
```
'Authorization: `Bearer ${access_token}`
'Content-Type': 'application/json'
```

This is a GraphQL based endpoint so you will want the pass in a raw POST data
Example GraphQL query:
NOTE: you will want to pass _either_ an email _or_ an id to query by. If you pass both only the id will be used to lookup the person.
```
{
  "query": "query ($id: ID, $email: String) { person(id: $id, email: $email) { id name hasRegistered } }",
  "variables": {
    "email": "test@hello.com"
    "id": PERSON_ID
  }
}
```
