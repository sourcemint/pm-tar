
const ASSERT = require("assert");
const PATH = require("path");
const FS = require("fs");
const ZLIB = require("zlib");
const URL_PROXY_CACHE = require("sourcemint-util-js/lib/url-proxy-cache");
const Q = require("sourcemint-util-js/lib/q");
const TERM = require("sourcemint-util-js/lib/term");
const TAR = require("tar");
const FS_RECURSIVE = require("sourcemint-util-js/lib/fs-recursive");





// @since sm@0.3
exports.for = function(package) {
    return {
        download: function(fromLocator, toLocator, options) {
            return fromLocator.fetch(options);
        },
        extract: function(fromLocator, toLocator, options) {
            var deferred = Q.defer();
/*            
            if (PATH.existsSync(path)) {
                FS_RECURSIVE.rmdirSyncRecursive(path);
            }
*/
            // TODO: Use os command if available as it is much faster.
            var stream = FS.createReadStream(fromLocator.location);
            stream.on("error", function(err) {
                deferred.reject(err);
            });
            var unzipper = ZLIB.createGunzip();
            unzipper.on("error", function(err) {
                deferred.reject(err);
            });
            var extracter = TAR.Extract({
                path: toLocator.location,
                strip: 1
            });
            extracter.on("error", function(err) {
                deferred.reject(err);
            });
            extracter.on("end", function() {
                deferred.resolve(200);
            });
            stream.pipe(unzipper).pipe(extracter);
            return deferred.promise;
        }
    };
}




exports.update = function(pm, options) {

throw new Error("DEPRECATED");

    options.update = true;

    return exports.install(pm, options);
}

exports.install = function(pm, options) {

throw new Error("DEPRECATED");

    ASSERT(typeof options.locator !== "undefined", "'options.locator' required!");

    var cache = new URL_PROXY_CACHE.UrlProxyCache(PATH.join(pm.context.homeBasePath, "url-cache"), {
        verbose: options.verbose,
        ttl: 0    // Indefinite
    });
    var url = options.locator;

    if (options.verbose) TERM.stdout.writenl("\0cyan(Locating: " + url + "\0)");

    if (!options.now) {
        if (options.verbose) TERM.stdout.writenl("\0yellow(SKIP: Fetching HEAD for '" + url + "'.\0)");
    }

    return cache.get(url, {
        loadBody: false,
        ttl: ((options.update)?1:false)
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
                deferred.resolve(200);
            });

            stream.pipe(unzipper).pipe(extracter);

            return deferred.promise;

        } else
        if (response.status === 304) {
            if (options.verbose) TERM.stdout.writenl("  \0green(Not modified\0)");
            return 304;
        } else
        if (response.status === 404) {
            throw new Error("URL '" + url + "' not found!");
        } else {
            throw new Error("Got status '" + response.status + "' when requesting URL '" + url + "'!");
        }
    });
}

