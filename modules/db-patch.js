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
    jsonpatch = require('fast-json-patch');

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

    const partition = model.partition || null,
          sort = model.sort || null,
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

    const patchInstructions = req.body;

    if(!patchInstructions) {
        return Promise.reject(404);
    }

    return crFactory.create( { model: model } )
    .then( o => {
        if(model.primary) {
            throw new Error( "ERROR: marchio-lambda-patch: model.primary should now be model.partition" );
        }
        if(!partition) {
            throw new Error( "ERROR: marchio-lambda-patch: model.partition not defined" );
        }

        recMgr = o; 

        const dbId = params.partition;
        if(!dbId) {
            return Promise.reject(404);
        } 
        
        var _key = {};
        _key[ partition ] = dbId;

        if( sort && params.sort ) {
            _key[sort] = params.sort;
        }

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
        var record = o[0].Item,  // var - will be modified in place
            dbId = o[1];
        // patch record - will modify record in place
        jsonpatch.apply( record, patchInstructions );
        return Promise.all([
            recMgr.build(record),
            Promise.resolve( dbId )
        ]); 
    })
    .then( (o) => {
        var record = o[0],  // var - will be modified in place
            dbId = o[1];
        // Have to insert primary partition key into record returned by getItem
        record[partition] = dbId;
        var patchObject = {
            "TableName": model.name,
            "ConditionExpression": `attribute_exists(${partition})`,
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
                    headers: {
                        "Content-Type": "application/json",
                        "x-marchio-table": model.name,
                        "x-marchio-partition": params.partition,
                        "x-marchio-sort": params.sort
                    },
                    statusCode: 404
                });
            } else {
                res.json({
                    statusCode: 500,
                    headers: {
                        "Content-Type": "application/json",
                        "x-marchio-error": err.message,
                        "x-marchio-table": model.name,
                        "x-marchio-partition": params.partition,
                        "x-marchio-sort": params.sort
                    },
                    body: { 
                        message: err.message, 
                        err: err
                    }
                });
            }
        } 
    });
};