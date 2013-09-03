/*
    Copyright 2012 Coherent Theory LLC

    This program is free software; you can redistribute it and/or
    modify it under the terms of the GNU General Public License as
    published by the Free Software Foundation; either version 2 of
    the License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>
*/

var utils = require('../utils.js');
var errors = require('../errors.js');
var createUtils = require('./createutils.js');
var async = require('async');
var url = require('url');

function findForum(db, req, res, assetInfo, cb)
{
    var discourseQuery = 'SELECT categoryName FROM discourseLinks WHERE assetId = $1;';
    db.query(discourseQuery, [req.params.assetId], function(err, result) {
        if (err) {
            e = errors.create('Database', err.message);
            cb(e, db, req, res, assetInfo);
            return;
        }
        assetInfo.json.asset.forum = '';
        if (result && result.rows.length > 0) {
            assetInfo.json.asset.forum =  app.config.service.discourse.externalUrl + 'category/'+ url.format(result.rows[0].categoryname);
        }
        cb(null, db, req, res, assetInfo);
    });
}

function findChangeLog(db, req, res, assetInfo, cb)
{
    var changeQuery =
        "SELECT version, versionts as timestamp, changes \
         FROM assetChangelogs log \
         WHERE log.asset=$1 AND log.changes IS NOT NULL ORDER BY versionts;";
    var incomingChangeQuery =
        "SELECT version, versionts as timestamp, changes \
         FROM incomingAssetChangelogs log \
         WHERE log.asset=$1 AND log.changes IS NOT NULL ORDER BY versionts;";
    var query = assetInfo.incoming ? incomingChangeQuery : changeQuery;

    var q = db.query(query, [req.params.assetId], function(err, result) {
        var i;
        var e;
        if (err) {
            e = errors.create('Database', err.message);
            cb(e, db, req, res, assetInfo);
            return;
        }
        assetInfo.json.asset.changelog = {};
        if (result && result.rows.length > 0) {
            for (i = 0; i < result.rows.length; ++i) {
                var obj = {
                    timestamp : result.rows[i].timestamp,
                    changes   : result.rows[i].changes
                };
                assetInfo.json.asset.changelog[result.rows[i].version] = obj;
            }
        }
        cb(null, db, req, res, assetInfo);
    });
}

function findPreviews(db, req, res, assetInfo, cb)
{
    var previewsQuery =
        "SELECT path FROM assetPreviews p WHERE p.asset=$1;";
    var incomingPreviewsQuery =
        "SELECT path FROM incomingAssetPreviews p WHERE p.asset=$1;";
    var query = assetInfo.incoming ? incomingPreviewsQuery : previewsQuery;

    var q = db.query(query, [req.params.assetId], function(err, result) {
        var i;
        var e;
        if (err) {
            e = errors.create('Database', err.message);
            cb(e, db, req, res, assetInfo);
            return;
        }
        assetInfo.json.asset.previews = [];
        if (result && result.rows.length > 0) {
            for (i = 0; i < result.rows.length; ++i) {
                assetInfo.json.asset.previews.push(result.rows[i]);
            }
        }

        cb(null, db, req, res, assetInfo);
    });
}


function findTags(db, req, res, assetInfo, cb)
{
    var tagsQuery =
        "SELECT tagTypes.type, tags.title FROM assetTags a JOIN tags ON \
         (a.tag = tags.id) LEFT JOIN tagTypes ON \
         (tags.type = tagTypes.id) where a.asset = $1;";
    var incomingTagsQuery =
        "SELECT tagTypes.type, tags.title FROM incomingAssetTags a \
         JOIN tags ON (a.tag = tags.id) LEFT JOIN tagTypes ON \
         (tags.type = tagTypes.id) where a.asset = $1;";
    var query = assetInfo.incoming ? incomingTagsQuery : tagsQuery;

    var q = db.query(query, [req.params.assetId], function(err, result) {
        var i;
        var e;
        if (err) {
            e = errors.create('Database', err.message);
            cb(e, db, req, res, assetInfo);
            return;
        }
        assetInfo.json.asset.tags = [];
        if (result && result.rows.length > 0) {
            for (i = 0; i < result.rows.length; ++i) {
                var obj = {};
                obj[result.rows[i].type] = result.rows[i].title;
                assetInfo.json.asset.tags.push(obj);
            }
        }

        cb(null, db, req, res, assetInfo);
    });
}

function findAsset(db, req, res, assetInfo, cb) {
    var table = assetInfo.incoming ? 'incomingAssets' : 'assets';
    var assetInfoQuery =
        "SELECT a.id, l.name as license, l.text as licenseText, \
         a.partner as partnerId, a.version, a.versionTs as created, \
         a.file, a.image, a.name, a.description, \
         ct_canDownload($3, $2, $1) AS downloadable, \
         ct_assetPrice($2, $1) AS price \
         FROM assets a \
         LEFT JOIN channelAssets ca ON (a.id = ca.asset)  \
         LEFT JOIN channels c ON (ca.channel = c.id)  \
         LEFT JOIN licenses l ON (a.license = l.id) \
         WHERE a.id = $1 AND c.store = $2 LIMIT 1";
    var incomingAssetInfoQuery =
        "SELECT a.id, l.name as license, l.text as licenseText, \
         a.partner as partnerId, a.version, a.file, a.image, a.name, \
         a.description, ct_canDownload($3, $2, $1) AS downloadable, \
         ct_assetPrice($2, $1) AS price \
         FROM incomingAssets a \
         LEFT JOIN licenses l ON (a.license = l.id) \
         WHERE a.id = $1" + (assetInfo.validator ? "" : " AND a.partner = $3");
    var query = assetInfo.incoming ? incomingAssetInfoQuery : assetInfoQuery;
    var userId = assetInfo.incoming ? assetInfo.partner : req.session.user.id;
    var args = [req.params.assetId,
                req.session.user.store,
                userId];

    var q = db.query(query, args, function(err, result) {
        var e;
        var json;
        if (err) {
            e = errors.create('Database', err.message);
            cb(e, db, req, res, assetInfo);
            return;
        }

        if (!result || result.rows.length !== 1) {
            e = errors.create('InvalidAsset');
            cb(e, db, req, res, assetInfo);
            return;
        }

        json = utils.standardJson(req);
        json.asset = {
            id :         result.rows[0].id,
            license:     result.rows[0].license,
            licenseText: result.rows[0].licenseText,
            partnerId:   result.rows[0].partnerid,
            version:     result.rows[0].version,
            created:     result.rows[0].created,
            filename:    result.rows[0].file,
            image:       result.rows[0].image,
            name:        result.rows[0].name,
            description: result.rows[0].description,
            points:      result.rows[0].price,
            canDownload: result.rows[0].downloadable
        };

        //console.log(JSON.stringify(json.asset, 0, 2));
        assetInfo.json = json;

        cb(null, db, req, res, assetInfo);
    });
}


function findIsCreator(db, req, res, assetInfo, cb)
{
    if (assetInfo.validator) {
        cb(null, db, req, res, assetInfo);
        return;
    }
    createUtils.isContentCreator(
        db, req, res, assetInfo,
        function(err, db, req, res, assetInfo) {
            var e;
            if (err) {
                e = errors.create('PartnerInvalid', err.message);
                cb(e, db, req, res, assetInfo);
                return;
            }
            cb(null, db, req, res, assetInfo);
        });
}

function findIsValidator(db, req, res, assetInfo, cb)
{
    createUtils.isValidator(
        db, req, res, assetInfo,
        function(err, db, req, res, assetInfo) {
            var e;
            if (!err) {
                assetInfo.validator = true;
            }

            var json = utils.standardJson(req);

            cb(null, db, req, res, assetInfo);
        });
}

function findRatings(db, req, res, assetInfo, cb)
{
    var query = 'SELECT rating AS averageRating, ratingsCount, attribute \
                 FROM assetRatingAverages WHERE asset = $1';
    db.query(query, [req.params.assetId],
            function(err, result) {
                var e;
                if (err) {
                    e = errors.create('Database', err.message);
                    cb(e, db, req, res, assetInfo);
                    return;
                }
                assetInfo.json.asset.ratings = result.rows;

                cb(null, db, req, res, assetInfo);
    });
}

module.exports = function(db, req, res) {
    var assetInfo = {};
    var funcs = [function(cb) {
        cb(null, db, req, res, assetInfo);
    }];

    if (!req.params.assetId || req.params.assetId === 'undefined') {
        errors.report('MissingParameters', req, res);
        return;
    }

    if (req.query.incoming) {
        assetInfo.incoming = true;
        funcs.push(findIsValidator);
        funcs.push(findIsCreator);
    }

    funcs.push(findAsset);
    funcs.push(findTags);
    funcs.push(findForum);
    if (req.query.previews) {
        funcs.push(findPreviews);
    }
    if (req.query.changelog) {
        funcs.push(findChangeLog);
    }

    if (req.query.ratings) {
        funcs.push(findRatings);
    }

    async.waterfall(funcs, function(err, db, req, res, assetInfo) {
        if (err) {
            errors.report(err.name, req, res, err);
            return;
        }
        res.send(assetInfo.json);
    });
};
