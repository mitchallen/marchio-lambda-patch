/* ************************
 * DO NOT EDIT AS index.js 
 * Edit lambda.js
 * The file will be copied to index.js for deployment
 */

/*jshint node: true */
/*jshint esversion: 6 */

"use strict";

const mlFactory = require('marchio-lambda-patch');

exports.handler = function(event, context, callback) {

    var model = {
        name: 'mldb',   // must match DynamoDB table name
        partition: 'eid',     // primary partition key - cannot be reserved word (like uuid)
        fields: {
            eid:      { type: String },
            email:    { type: String, required: true },
            status:   { type: String, required: true, default: "NEW" },
            password: { type: String, select: false }  // select: false, exclude from query results
        }
    };

    mlFactory.create({ 
        event: event, 
        context: context,
        callback: callback,
        model: model
    })
    .catch(function(err) {
        callback(err);
    });
};