## CookieIO.js
Using JavaScript objects as an interface for working with cookies in the browser

## Description
The library relates key-value pairs of cookie entries to property-value pairs of a JavaScript object and vice versa.
It also allows placing constraints on the size of entries being stored.


## Usage

## Reading entries
```javascript
var cookies = CookieIO.getObject({/**settings**/});
```
## Writing entries
```javascript
var obj = {a: "a", b: "b"};
var success = CookieIO.saveObject(obj, {/**settings**/});
```
## Deleting entries
```javascript
CookieIO.subtractObject({a: "a", b: "b"}); 
CookieIO.subtractObject( CookieIO.getObject() ); //delete all
```

## Default settings
```javascript
var defaultSettings = {
    /**work modifiers**/
    nEncoder: encodeURIComponent,
    nDecoder: decodeURIComponent,
    vEncoder: encodeURIComponent,
    vDecoder: decodeURIComponent,
    reducer: null,
    rCallLim: 2000,
    globLimit: 2048,
    locLimit: null,
    names: null,
    inverse: false,
    /**cookie attributes**/
    expires: null, days: 365, maxAge: null,
    path: null,
    domain: null,
    secure: null,
    samesite: null,
};
//if a cookie attribute is set to a value *null*
//it means it should be ignored.
```

## Settings description
* **nEncoder**: cookie name encoder
* **nDecoder**: cookie name decoder
* **vEncoder**: cookie value encoder
* **vDecoder**: cookie value decoder
* **globLimit**: a limit on the overall size of encoded key-value pairs, 
that is what is transferred to the server
* **locLimit**: a limit on the size of encoded key-value pairs 
for the object passed for saving, if both limits are set 
both will be taken into account. If it is impossible to 
place the data within either limit the operation will be aborted.
* **reducer**: if an encoded string of entries to be stored exceeds the specified limits 
this function is called to delete some data from the object 
until it's possible to place the object into these boundaries.
This function accepts the object and is meant to return a smaller object, 
or *null* or *false* if the object cannot be anymore minified 
to abort the operation. the number of invocation is passed 
as the second argument, starting with *0*.
* **rCallLim**: a limit defining a maximal number of reducer invocations, 
if it exceeded the limit the operation is aborted
* **names**: an array listing the names that will be filtered, or *null* for no filtering
* **inverse**: if the value is *false*, the data with names/keys the filter array contains
will only be extracted, otherwise anything but that.
* **expires**/**days**/**maxAge**: these attributes result 
in a value of the cookie attribute *Expires*, defining 
an expiration date of entries, **expires** can be assigned to a timestamp of that date or 
a Date object, **days** can be assigned to a numeric value 
defining the lifetime in days and **maxAge** defines this period in seconds. 
To specify the lifetime as session-long any of these attributes should be assigned to a value *null*.

## Overriding settings
There are two ways of overriding: creating a new instance with binding a new settings
object that will redefine some of the base instance settings or by passing a settings object 
directly to the invoked method. if some property isn't ever specified it is inherited from
the default settings.
```javascript
var commonCookies = CookieIO.getInstance({days: 700});
var base64Cookies = commonCookies.getInstance({
    vEncoder: commonCookies.base64Encoder,
    vDecoder: commonCookies.base64Decoder,
});
var objectCookies = commonCookies.getInstance({
    vEncoder: commonCookies.objectEncoder,
    vDecoder: commonCookies.objectDecoder,
});
```

## Predefined encoders / decoders
```javascript
//they also available on instances
CookieIO.base64Encoder //btoa(v)
CookieIO.base64Decoder //atob(v)
CookieIO.objectEncoder //encodeURIComponent(JSON.stringify(v))
CookieIO.objectDecoder //JSON.parse(decodeURIComponent(v))
CookieIO.defaultEncoder //encodeURIComponent
CookieIO.defaultDecoder //decodeURIComponent
CookieIO.passThru //v => v
```

## Default reducer
The default reducer deletes one object property per call starting with ones added most recently until 
the object gets small enough to meet the constraints or if it is impossible 
to add a single entry the operation will be aborted.
```javascript
CookieIO.defaultReducer
```

## Example
```javascript
var cookieIO = CookieIO.getInstance({
    globLimit: 192,
    days: 90,
});

var regularCookies = cookieIO.getInstance({
    names: ["_reg_a", "_reg_b"],
    vEncoder: cookieIO.base64Encoder,
    vDecoder: cookieIO.base64Decoder,
    locLimit: 48,
});
regularCookies.saveObject({
    "_reg_a": "abcdefghijab",
    "_reg_b": "abcdefghi",
});

var objectCookies = cookieIO.getInstance({
    names: ["_obj_a", "_obj_b" ],
    vEncoder: cookieIO.objectEncoder,
    vDecoder: cookieIO.objectDecoder,
    locLimit: 96,
    reducer: function(obj, callCounter) {
        if ( "_obj_b" in obj ) {
            if ( obj["_obj_b"].length > 0 ) {
                obj["_obj_b"].pop();
                return obj;
            } else {
                delete obj["_obj_b"];
                return obj;
            }
        } else if ( "_obj_a" in obj ) {
            delete obj["_obj_a"];
            return obj;
        } else {
            return null; //abort operation
            //return {}; //delete entries
        }
    },
});
objectCookies.saveObject({
    "_obj_b": [ 10000, 20000, 30000, 40000, 50000 ],
    "_obj_a": { a: [ 0, 1, 2, 3 ], b: "abcd" },
}); //"_obj_b" array will contain only two elements

var temporaryCookies = cookieIO.getInstance({
    names: ["_obj_a", "_obj_b", "_reg_a", "_reg_b"],
    inverse: true,
    expires: null,
    locLimit: 48,
    reducer: cookieIO.defaultReducer,
});
temporaryCookies.saveObject({
    "_tmp_a": "01234567890123456789",
    "_tmp_b": "0123456789",
    "_tmp_c": "0123456789", //won't be saved
});

console.log( temporaryCookies.getObject() );
console.log( regularCookies.getObject() );
console.log( objectCookies.getObject() );

temporaryCookies.subtractObject( temporaryCookies.getObject() );
regularCookies.subtractObject( regularCookies.getObject() );
objectCookies.subtractObject( objectCookies.getObject() );
```
