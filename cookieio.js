var CookieIO = (function() {
    var isObject = function(value) {
        return (value !== null &&
            typeof value === "object" &&
            value.constructor === Object);
    };
    var isArray = function(value) {
        return (value !== null &&
            typeof value === "object" &&
            value.constructor === Array);
    };
    var attrDefined = function(attr, settings) {
        return ( settings && attr in settings && settings[attr] !== false 
            && settings[attr] !== null && settings[attr] !== undefined );
    };
    var passThru = function(v) { return v; };
    var attrs = {
        "path": "path", 
        "domain": "domain", 
        "expires": "expires",
        "secure": "secure",
        "samesite": "samesite",
    };
    var formSettings = function(globalSettings, localSettings, prepareForOutput) {
        var result = Object.create( globalSettings );
        if ( isObject(localSettings) ) {
            for ( var name in localSettings ) {
                result[name] = localSettings[name];
            }
        }
        if ( prepareForOutput === 0 ) return result;
        if ( isObject(localSettings) ) {
            if ( "expires" in localSettings ) {
                result.days = null;
                result.maxAge = null;
            }
            if ( "days" in localSettings ) {
                result.expires = null;
                result.maxAge = null;
            }
            if ( "maxAge" in localSettings ) {
                result.expires = null;
                result.days = null;
            }
        }
        if ( prepareForOutput === -1 ) return result;
        if ( typeof result.expires === "number" ) {
            result.expires = new Date(result.expires);
        }
        if ( typeof result.days === "number" ) {
            result.expires = new Date((new Date()).valueOf() + 
                864e5*result.days);
        }
        if ( typeof result.maxAge === "number" ) {
            result.expires = new Date((new Date()).valueOf() + 
                result.maxAge*1e3);
        }
        if ( result.expires !== null && typeof result.expires !== "string" ) {
            result.expires = result.expires.toUTCString();
        }
        return result;
    };
    var getObject = function(settings) {
        var result = {}, cookie = document.cookie;
        var filterOn = (isArray(settings.names) && settings.names.length > 0);
        var parser = /\s*\b(.*?)\s*=\s*["']?(.*?)["']?\s*(?:;|$)/g;
        cookie.replace(parser, function(match, name, value) {
            name = settings.nDecoder( name );
            if ( filterOn ) {
                var isFound = (settings.names.indexOf(name) > -1);
                if ( !isFound && !settings.inverse ) return match;
                if ( isFound && settings.inverse ) return match;
            }
            result[ name ] = settings.vDecoder( value );
            return match;
        });
        return result;
    };
    var subtractObject = function(values, settings) {
        var expiration = (new Date(new Date().valueOf() - 864e5)).toUTCString();
        var filterOn = (isArray(settings.names) && settings.names.length > 0);
        var attrsStr = "";
        if ( settings.domain ) attrsStr += "; " + attrs.domain + "=" +  settings.domain;
        if ( settings.path ) attrsStr += "; " + attrs.path + "=" +  settings.path;
        for ( var name in values ) {
            if ( filterOn ) {
                var isFound = (settings.names.indexOf(name) > -1);
                if ( !isFound && !settings.inverse ) continue;
                if ( isFound && settings.inverse ) continue;
            }
            var nameEncoded = settings.nEncoder(name);
            document.cookie = nameEncoded + "=; expires=" + expiration + attrsStr;
        }
        return true;
    };
    var saveObject = function(values, settings) {
        var filterOn = ( isArray(settings.names) &&
                settings.names.length > 0 );
        var rCallCounter=0, oEntriesSize=0, entriesToDelete = {};
        var result, stored = getObject({vDecoder: passThru, nDecoder: passThru});
        var localLim = ( typeof settings.locLimit === "number" )
                ? settings.locLimit
                : null;
        var globalLim = ( typeof settings.globLimit === "number" )
                ? settings.globLimit
                : null;
        do {
            result = {};
            var cEntriesSize = 0;
            for ( var name in values ) {
                if ( filterOn ) {
                    var isFound = (settings.names.indexOf(name) > -1);
                    if ( !isFound && !settings.inverse ) continue;
                    if ( isFound && settings.inverse ) continue;
                }
                var nameEncoded = settings.nEncoder(name);
                var valueEncoded = settings.vEncoder(values[name]);
                result[nameEncoded] = valueEncoded;
                cEntriesSize += nameEncoded.length + valueEncoded.length + 3;
                if ( rCallCounter === 0 && nameEncoded in stored ) 
                    entriesToDelete[nameEncoded] = null;
            }
            if ( rCallCounter === 0 && globalLim !== null ) {
                for ( var name in stored ) {
                    if ( name in result ) continue;
                    oEntriesSize += name.length + stored[name].length + 3;
                }
            }
            var totalSize = cEntriesSize + oEntriesSize - (( cEntriesSize > 0 ) ? 2 : 0);
            if ( 
                (globalLim === null || totalSize <= globalLim) &&
                (localLim === null || cEntriesSize <= localLim) 
            ) break;
            if ( typeof settings.reducer !== "function" ) {
                console.error( "object cannot be placed in the defined limits" );
                return false;
            }
            if ( rCallCounter === settings.rCallLim ) {
                console.error( "reducer seems written incorrectly" );
                return false;
            }
            values = settings.reducer(values, rCallCounter++);
            if ( !values ) {
                console.error( "object cannot be placed in the defined limits" );
                return false;
            }
        } while ( true );
        if ( rCallCounter > 0 ) {
            for ( var name in result ) delete entriesToDelete[name];
            subtractObject(entriesToDelete, {nEncoder: passThru});
        }
        var attrsStr = "";
        for ( var j in attrs ) {
            if ( attrDefined(j, settings) ) {
                attrsStr += "; " + attrs[j];
                var attrValue = settings[j];
                if ( typeof attrValue === "boolean" ) continue;
                attrsStr += "=" + attrValue;
            }
        }
        for ( var name in result ) {
            document.cookie = name + "=" + result[name] + attrsStr;
        }
        return true;
    };
    return {
        settings: {
            nEncoder: encodeURIComponent,
            nDecoder: decodeURIComponent,
            vEncoder: encodeURIComponent,
            vDecoder: decodeURIComponent,
            reducer: null,
            rCallLim: 2000,
            globLimit: 2048,
            locLimit: null,
            expires: null,
            days: 365,
            names: null,
            inverse: false,
        },
        getObject: function(localSettings) {
            var settings = formSettings( this.settings, localSettings, 0 );
            return getObject( settings );
        },
        saveObject: function(values, localSettings) {
            settings = formSettings( this.settings, localSettings, 1 );
            return saveObject( values, settings );
        },
        subtractObject: function(values, localSettings) {
            settings = formSettings( this.settings, localSettings, 0 );
            return subtractObject( values, settings );
        },
        getInstance: function(settings) {
            var instance = Object.create( this );
            instance.settings = formSettings( this.settings, settings, -1 );
            return instance;
        },
        defaultReducer: function(obj, counter) {
            var name = null;
            for ( var i in obj ) name = i;
            if ( name === null ) return null;
            delete obj[name];
            return obj;
        },
        objectEncoder: function(value) {
            return encodeURIComponent(JSON.stringify(value));
        },
        objectDecoder: function(value) {
            return JSON.parse(decodeURIComponent(value));
        },
        base64Encoder: function(v) { return btoa(v); },
        base64Decoder: function(v) { return atob(v); },
        defaultEncoder: encodeURIComponent,
        defaultDecoder: decodeURIComponent,
        passThru: passThru,
    };
})();
if ( typeof exports === 'object' && typeof module === 'object' ) {
    module.exports = CookieIO;
}