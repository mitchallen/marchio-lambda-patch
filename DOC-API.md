## Modules

<dl>
<dt><a href="#module_marchio-lambda-patch">marchio-lambda-patch</a></dt>
<dd><p>Module</p>
</dd>
<dt><a href="#module_marchio-lambda-patch-factory">marchio-lambda-patch-factory</a></dt>
<dd><p>Factory module</p>
</dd>
</dl>

<a name="module_marchio-lambda-patch"></a>

## marchio-lambda-patch
Module

<a name="module_marchio-lambda-patch-factory"></a>

## marchio-lambda-patch-factory
Factory module

<a name="module_marchio-lambda-patch-factory.create"></a>

### marchio-lambda-patch-factory.create(spec) ⇒ <code>Promise</code>
Factory method 
It takes one spec parameter that must be an object with named parameters

**Kind**: static method of <code>[marchio-lambda-patch-factory](#module_marchio-lambda-patch-factory)</code>  
**Returns**: <code>Promise</code> - that resolves to {module:marchio-lambda-patch}  

| Param | Type | Description |
| --- | --- | --- |
| spec | <code>Object</code> | Named parameters object |
| spec.event | <code>Object</code> | Lambda event |
| spec.context | <code>Object</code> | Lambda context |
| spec.callback | <code>function</code> | Lambda callback |
| spec.model | <code>Object</code> | Table model |
| [spec.filter] | <code>function</code> | A function that takes the original record and returns a {Promise} that resolves to a filtered record |

**Example** *(Usage example)*  
```js
// Lambda root file
"use strict";

var mlFactory = require('marcio-lambda-patch'); 

var getRandomInt = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
};

// Why not just demo hashing with bcrypt?
// Because bcrypt requires installing on AWS Linux before packaging
// That's beyond the scope of this example, so we fake it.
 
function fakeHash( record ) {
   // Not a real hash function - do not use in production
   return new Promise( (resolve, reject) => {
        if(!record) {
            return reject('record not defined');
        }
        if(!record.password) {
            return reject('record.password not defined');
        }
        // fake hashing - do not use in production
        record.password = '$' + getRandomInt(10000, 10000000);
        resolve(record);
   });
}

exports.handler = function(event, context, callback) {

    var model = {
        name: 'mldb',   // must match DynamoDB table name
        primary: 'eid', // primary key - cannot be reserved word (like uuid)
        fields: {
            email:    { type: String, required: true },
            status:   { type: String, required: true, default: "NEW" },
            // Password will be (fake) hashed by filter before being saved
            password: { type: String, select: false },  // select: false, exclude from query results
        }
    };

    mlFactory.create({ 
        event: event, 
        context: context,
        callback: callback,
        model: model,
        filter: fakeHash
    })
    .catch(function(err) {
        callback(err);
    });
 };
```
