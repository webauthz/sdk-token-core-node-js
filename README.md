sdk-token-core-node-js
======================

Generate and validate tokens.

This library integrates into the resource or authorization server
back-end JavaScript using NodeJS.

Use this library for all token types: 'access', 'client', 'grant', and 'refresh'.

# Usage

To integrate this library with a resource or authorization server
you will need two imports. One is
for this library, the other one is for a data driver that manages the persistent
data storage for this library. In this example, we use an in-memory storage
driver:

```
const { WebauthzTokenMemoryDatabase } = require('@webauthz/sdk-token-data-memory-js');
const { WebauthzToken } = require('@webauthz/sdk-token-core-node-js');
```

Then, create an instance of the Webauthz class and configure it:

```
// webauthz token manager with in-memory database
const webauthzToken = new WebauthzToken({
    database: new WebauthzTokenMemoryDatabase(),
});
```

Generate access tokens:

```
const access_token = await webauthzToken.generateToken({
    type: 'access',
    client_id,
    realm,
    scope,
    path,
    not_after,
    user_id
});
```

Generate client tokens:

```
const client_token = await webauthzToken.generateToken({
    type: 'client',
    client_id,
    realm: 'Webauthz',
    scope: 'webauthz:client',
    path: '/api/webauthz',
});
```

Generate grant tokens:

```
const grant_token = await webauthzPlugin.generateToken({
    type: 'grant',
    client_id,
    request_id
});
```

Generate refresh tokens:

```
const refresh_token = await webauthzPlugin.generateToken({
    type: 'refresh',
    client_id,
    request_id
});
```

The next place to integrate the library is wherever you initialize middleware such
as WebauthzExpress. The middleware uses the `checkToken` method of this library to
validate incoming bearer tokens:

```
const authorizationHeader = req.header('Authorization');
const tokenInput = authorizationHeader.substr('bearer '.length).trim();
const tokenInfo = await webauthzToken.checkToken(tokenInput);
```

# API

An application will need to use the following functions:

* generateToken
* checkToken

## generateToken

Example usage:

```
const access_token = await webauthzToken.generateToken({
    type: 'access',
    client_id,
    realm,
    scope,
    path,
    not_after,
    user_id
});
```

Generate a random token, compute the hash of the token, and store the
hash associated to the specified token info.

Parameters:

* `param0` (object, required) is an object with the properties `type`, `client_id`, and other type-specific properties.

Properties of `param0`:

* `type` (string, required) the token type; one of 'access', 'client', 'grant', or 'refresh'
* `client_id` (string, required) the unique id of the client for which the token is generated

Return value: the token value to return to the client

## checkToken

Example usage:

```
const tokenInfo = await webauthzPlugin.checkToken(bearerToken);
```

Validate a token.

Parameters:

* `param0` (string, required) the bearer token value

Return value: If successful, returns the validated token info. Otherwise, throws an exception.

# Storage

The library uses an abstract `database` object to store and lookup information in
pesistent storage. The application must provide an object that implements the storage
interface documented here.

See also [sdk-token-data-memory-js](https://github.com/webauthz/sdk-token-data-memory-js/) for an example
in-memory implementation that is useful for testing.

## createToken

Example usage:

```
const isCreated = await database.createToken(id, record);
```

Create new record, or replace existing record. Should not throw exception unless there is a write error.

The `record` object is stored using the `id` as the primary key.

Parameters:

* `param0` (string, required) the value of `id`
* `param1` (object, required) is an object with the token info to store

Returns a boolean indicating whether the write operation was successful.

## fetchToken

Example usage:

```
const record = await database.fetchToken(id);
```

Fetch an existing token record from storage.

Parameters:

* `param0` (string, required) the value of `id`

Return the token record object, or
null if it is not found.

# Build

```
npm run lint
npm run build
```
