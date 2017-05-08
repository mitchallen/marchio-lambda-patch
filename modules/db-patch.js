/**
    Module: db-patch.js
    Author: Mitch Allen
*/

/*jshint node: true */
/*jshint esversion: 6 */

"use strict";

const doc = require('dynamodb-doc'),
    docClient = doc ? new doc.DynamoDB() : null,
    crFactory = require('marchio-core-record'),
    jsonpatch = require('fast-json-patch'),
    path = '/:model/:id?';

function defaultFilter( record ) {
    return new Promise( (resolve, reject) => {
        if(!record) {
            return reject('record not defined');
        }
        resolve(record);
    });
}

module.exports.create = ( spec ) => {

    spec = spec || {};

    const adapter = spec.adapter,
          marchio = spec.marchio;

    const model = marchio.model,
          filter = marchio.filter || defaultFilter;

    const query = adapter.query,
          params = adapter.params,
          method = adapter.method,
          body = adapter.body,
          res = adapter.response,
          env = adapter.env;

    const primaryKey = model.primary,
          jsonp = query.jsonp || false,
          cb = query.cb || 'callback';

    var recMgr = null,
        idMgr = null,
        eMsg = '';

    var req = {
        method: method,
        query: query,
        params: params,
        body: body
    };

    var _code = 200;
    var _headers = {
        "Content-Type" : "application/json"
    };

    if(method !== 'PATCH') {
        var resObject = {
            statusCode: 405,
            headers: {
                "Content-Type": "application/json",
                "x-marchio-http-method": method,
                "x-marchio-error": "HTTP Method not supported"
            },
            body: {} 
        };
        res.json(resObject);
        return;
    }

    // TODO - check primaryKey against DynamoDB reserved words
    if(!primaryKey) {
        throw new Error('dp-patch: model.primary not defined.');
    }

    const patchInstructions = req.body;

    if(!patchInstructions) {
        return Promise.reject(404);
    }

    return crFactory.create( { model: model } )
    .then( o => {
        recMgr = o; 
        const dbId = params.id;
        if(!dbId) {
            return Promise.reject(404);
        } 
        var _key = {};
        _key[ primaryKey ] = dbId;
        var getObject = {
            "TableName": model.name,
            "Key": _key
        };
        return Promise.all([
                docClient.getItem( getObject ).promise(),
                Promise.resolve( dbId )
        ]);
    })
    .then( (o) => {
        var record = o[0],  // var - will be modified in place
            dbId = o[1];  
        // patch record - will modify record in place
        jsonpatch.apply( record, patchInstructions );
        // Have to insert primay key into record returned by getItem
        record[primaryKey] = dbId;
        var patchObject = {
            "TableName": model.name,
            "ConditionExpression": `attribute_exists(${primaryKey})`,
            "Item": record
        };
        return Promise.all([
                docClient.putItem( patchObject ).promise(),
                Promise.resolve( dbId )
            ]);
    })
    .then( (o) => {
        var data = o[0],    // not used (returning 204)
            dbId = o[1];
        var resObject = {
            statusCode: 204, // not returnint data 
            headers: {
                "Content-Type" : "application/json",
                "Location": "/" + [ model.name, dbId ].join('/')
            }
        };
        res
            .json(resObject);
    })
    .catch( (err) => {  
        if(err) {
            if( err === 404 ) {
                res.json({
                    statusCode: 404
                });
            } else {
                res.json({
                    statusCode: 500,
                    body: { 
                        message: err.message, 
                        err: err
                    }
                });
            }
        } 
    });
};