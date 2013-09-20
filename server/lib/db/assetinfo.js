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
    var e;
    var discourseQuery = 'SELECT categoryName FROM discourseLinks WHERE assetId = $1;';
    db.query(discourseQuery, [req.params.assetId], function(err, result) {
        if (err) {
            e = errors.create('Database', err.message);
            cb(e, db, req, res, assetInfo);
            return;
        }
        assetInfo.json.asset.forum = '';
        if (result && result.rowCount > 0) {
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
        if (result && result.rowCount > 0) {
            for (i = 0; i < result.rowCount; ++i) {
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
        for (i = 0; i < result.rowCount; ++i) {
            assetInfo.json.asset.previews.push(result.rows[i]);
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
        for (i = 0; i < result.rowCount; ++i) {
            var obj = {};
            obj[result.rows[i].type] = result.rows[i].title;
            assetInfo.json.asset.tags.push(obj);
        }

        cb(null, db, req, res, assetInfo);
    });
}

function assetFromRow(row, brief)
{
    var asset = {
        id:          row.id,
        license:     row.license,
        licenseText: row.licenseText,
        partnerId:   row.partnerid,
        partner:     row.partnername,
        version:     row.version,
        versionts:   row.versionts,
        created:     row.created,
        filename:    row.file,
        image:       row.image,
        name:        row.name,
        description: row.description,
        size:        row.size
    };

    if (!brief) {
        asset.points = row.price;
        asset.canDownload = row.downloadable;
    }

    return asset;
}

function findAsset(db, req, res, assetInfo, cb) {
    var table;
    var query;
    var args;
    var expectedRowCount = 1;

    if (assetInfo.incoming) {
        table = 'incomingAssets';
        query =
        "SELECT a.id, l.name as license, l.text as licenseText, \
         a.partner as partnerId, p.name as partnername, \
         a.version, a.file, a.image, a.name, \
         a.description, a.size \
         FROM incomingAssets a \
         LEFT JOIN licenses l ON (a.license = l.id) \
         LEFT JOIN partners p ON (a.partner = p.id) \
         WHERE a.id = $1";
        args = [assetInfo.assetId];

        if (!assetInfo.validator) {
            query += " AND a.partner = $2";
            args.push(assetInfo.partner);
        }
    } else {
        var multi = Array.isArray(assetInfo.assetId);
        table = 'assets';
        query = "SELECT a.id, l.name as license, l.text as licenseText, \
            a.partner as partnerId, p.name as partnername, \
            a.version, a.versionTs as created, \
            a.file, a.image, a.name, a.description, a.size";

         if (!multi) {
             query += ", ct_canDownload($2, $1, a.id) AS downloadable, \
                         ct_assetPrice($1, a.id) AS price";
         }

         query += " FROM assets a \
            LEFT JOIN licenses l ON (a.license = l.id) \
            LEFT JOIN partners p ON (a.partner = p.id) \
            WHERE a.id IN (SELECT ca.asset FROM channelAssets ca \
                           LEFT JOIN channels c ON (ca.channel = c.id) \
                           WHERE c.store = $1 AND ca.asset";

        args = [req.session.user.store];

        if (Array.isArray(assetInfo.assetId)) {
            expectedRowCount = assetInfo.assetId.length;
            var index = 1;
            query += " IN (";
            for (var i in assetInfo.assetId) {
                if (index > 1) {
                    query += ', ';
                }
                args[index] = assetInfo.assetId[i];
                ++index;
                query += "$" + index;
            }
            query += ")) ORDER BY a.id";
        } else {
            args[1] = req.session.user.id;
            args[2] = assetInfo.assetId;
            query += " = $3)";
        }
    }

    //console.log("query: " + query)
    //console.log("args: " + args);

    var q = db.query(query, args, function(err, result) {
        var e;
        var json;
        if (err) {
            e = errors.create('Database', err.message);
            cb(e, db, req, res, assetInfo);
            return;
        }

        //console.log("we got " + result.rowCount + " and expected " + expectedRowCount);
        if (!result || result.rowCount !== expectedRowCount) {
            e = errors.create('InvalidAsset');
            cb(e, db, req, res, assetInfo);
            return;
        }

        json = utils.standardJson(req);
        if (expectedRowCount > 1) {
            json.assets = [];
            for (var i = 0; i < result.rowCount; ++i) {
                json.assets.push(assetFromRow(result.rows[i], true));
            }

            //console.log(JSON.stringify(json.assets, 0, 2));
        } else {
            json.asset = assetFromRow(result.rows[0], assetInfo.incoming);
            //console.log(JSON.stringify(json.asset, 0, 2));
        }

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

module.exports.fullSingleAsset = function(db, req, res) {
    if (!req.params.assetId || req.params.assetId === 'undefined') {
        errors.report('MissingParameters', req, res);
        return;
    }

    var assetInfo = {
        assetId: req.params.assetId
    };

    var funcs = [function(cb) {
        cb(null, db, req, res, assetInfo);
    }];

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

module.exports.multipleAssetBriefs = function(db, req, res) {
    if (!req.body.assetIds || !Array.isArray(req.body.assetIds) || req.body.assetIds.length < 1) {
        errors.report('MissingParameters', req, res);
        return;
    }

    var assetInfo = {
        assetId: req.body.assetIds,
    };

    findAsset(db, req, res, assetInfo,
              function(err, db, req, res, assetInfo) {
                  if (err) {
                      errors.report(err.name, req, res, err);
                      return;
                  }

                  res.send(assetInfo.json);
              });
};
