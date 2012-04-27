
const ASSERT = require("assert");
const PATH = require("path");
const FS = require("fs");
const ZLIB = require("zlib");
const URL_PROXY_CACHE = require("sourcemint-util-js/lib/url-proxy-cache");
const Q = require("sourcemint-util-js/lib/q");
const TERM = require("sourcemint-util-js/lib/term");
const TAR = require("tar");
const FS_RECURSIVE = require("sourcemint-util-js/lib/fs-recursive");


exports.status = function(pm, options) {

    console.log("STATUS");    
    
}

exports.update = function(pm, options) {

    options.update = true;

    return exports.install(pm, options);
}

exports.install = function(pm, options) {

    ASSERT(typeof options.locator !== "undefined", "'options.locator' required!");

    var cache = new URL_PROXY_CACHE.UrlProxyCache(PATH.join(pm.context.homeBasePath, "url-cache"), {
        ttl: 0    // Indefinite
    });
    var url = options.locator;

    TERM.stdout.writenl("\0cyan(Locating: " + url + "\0)");
    
    return cache.get(url, {
        loadBody: false,
        ttl: ((options.update)?-1:false)
    }).then(function(response) {

        var summary = {};
        
        var path = pm.context.package.path;

        if (response.status === 200 || (response.status === 304 && !PATH.existsSync(path))) {

            var deferred = Q.defer();
            
            if (PATH.existsSync(path)) {
                FS_RECURSIVE.rmdirSyncRecursive(path);
            }
            
            TERM.stdout.writenl("\0cyan(Untarring '" + response.cachePath + "' to '" + path + "'\0)");

            var stream = FS.createReadStream(response.cachePath);
            stream.on("error", function(err) {
                deferred.reject(err);
            });

            var unzipper = ZLIB.createGunzip();
            unzipper.on("error", function(err) {
                deferred.reject(err);
            });
            
            var extracter = TAR.Extract({
                path: path,
                strip: 1
            });
            extracter.on("error", function(err) {
                deferred.reject(err);
            });
            extracter.on("end", function() {
                deferred.resolve();
            });

            stream.pipe(unzipper).pipe(extracter);

            return deferred.promise;

        } else
        if (response.status === 304) {
            TERM.stdout.writenl("  \0green(Not modified\0)");
        } else
        if (response.status === 404) {
            throw new Error("URL '" + url + "' not found!");
        } else {
            throw new Error("Got status '" + response.status + "' when requesting URL '" + url + "'!");
        }
    });
}

