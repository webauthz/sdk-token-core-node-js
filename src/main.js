/*!
Copyright (C) 2021 Cryptium Corporation. All rights reserved.
*/

const crypto = require('crypto');
const { randomBuffer } = require('@cryptium/random-node-js');

/*
log - optional log instance (must have `trace`, `info`, `warn`, `error` functions), default is `console`
database - object that implements the Webauthz Data interface
separator - default is ':' but you can use another character instead, for example '~', when generating and parsing tokens
*/
class WebauthzToken {
    constructor({ log = console, database, separator = ':' } = {}) {
        this.log = log;
        this.database = database;
        this.separator = separator;
    }

    // this method generates a token, stored the token hash and original token length, and returns the token
    // the token type 'client', 'grant', 'refresh', and 'access' are included in the index so the full search space is
    // available for each token type.
    // 'type' is required 
    // 'client_id' is required
    async generateToken({ client_id, type, ...info }) {
        
        // the token value is 96 bytes
        const token_buffer = randomBuffer(96);
        const token_base64_url = token_buffer.toString('base64').replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, ""); // url-safe base64 variant; see https://tools.ietf.org/html/rfc4648#section-5

        // compute the token hash
        const sha384 = crypto.createHash('sha384');
        sha384.update(token_buffer);
        const token_hash_buffer = sha384.digest();
        const token_hash_base64_url = token_hash_buffer.toString('base64').replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, ""); // url-safe base64 variant

        // we use client_id as a namespace to minimize the chance of collision; the token space is PER CLIENT
        const token = [type, client_id, token_base64_url].join(this.separator);
        const index = [type, client_id, token_hash_base64_url].join(this.separator);
        const record = { type, client_id, ...info, token_buffer_length: token_buffer.length };

        const isCreated = await this.database.createToken(index, record);
        if (!isCreated) {
            // throw new WebauthzTokenWriteException('failed to store access token');
            return null; // don't return a token that wasn't stored, because the client won't be able to use it
        }

        return token;
    }

    /*
    Input: bearer token from authorization header
    Output: object with authorized client information, or error

    NOTE: this method does NOT need to check if token expired; the caller will do that using the not_after date returned by this method
    */
    async checkToken(bearerToken) {
        
        const [type, client_id, tokenValue] = bearerToken.split(this.separator);
        if (typeof type !== 'string' || typeof client_id !== 'string' || typeof tokenValue !== 'string') {
            this.log.trace('checkToken: invalid bearer token format');
            return { error: 'invalid-token' };
        }

        // the token value is 96 bytes
        const token_buffer = Buffer.from(tokenValue, 'base64');

        // compute the token hash
        const sha384 = crypto.createHash('sha384');
        sha384.update(token_buffer);
        const token_hash_buffer = sha384.digest();
        const token_hash_base64_url = token_hash_buffer.toString('base64').replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, ""); // url-safe base64 variant

        // we use client id as a namespace to minimize the chance of collision; the token space is PER TYPE, PER CLIENT
        const index = [type, client_id, token_hash_base64_url].join(this.separator);
        const record = await this.database.fetchToken(index);

        if (typeof record !== 'object' || record === null) {
            throw new Error('token not found');
        }

        console.log(`checkToken: token record ${JSON.stringify(record)}`);

        const { type: stored_type, client_id: stored_client_id, token_buffer_length: stored_token_buffer_length } = record;

        if (type !== stored_type) {
            this.log.trace('checkToken: token type does not match stored value');
            throw new Error('invalid token');
        }

        if (client_id !== stored_client_id) {
            this.log.trace('checkToken: token client_id does not match stored value');
            throw new Error('invalid token');
        }

        if (token_buffer.length !== stored_token_buffer_length) {
            this.log.trace('checkToken: token length does not match stored value');
            throw new Error('invalid token');
        }

        // return valid token info
        this.log.trace(`checkToken result ${JSON.stringify(record)}`);
        return record;
    }
}

export { WebauthzToken };
