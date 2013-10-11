/*
    Copyright 2013 Coherent Theory LLC

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

function sendResponse(err, db, req, res, assetInfo, assets, totalAssets)
{
    if (err) {
        errors.report(err.name, req, res, err);
    } else {
        var json = utils.standardJson(req, true);
        json.assets = assets;
        json.totalAssets = totalAssets;
        res.send(json);
    }
}


function assetTagFetcher(asset, cb)
{
    asset.db.query('select tags.id, tagtypes.id as typeid, tagtypes.type as type, title \
          from ' + (asset.published ? 'assettags' : 'incomingassettags') + ' t join tags on t.tag = tags.id \
          join tagtypes on tagtypes.id = tags.type \
          where asset = $1',
        [asset.asset],
        function (err, result) {
            if (err) {
                cb(errors.create('Database', err.message));
                return;
            }

            for (var i = 0; i < asset.allAssets.length; ++i) {
                if (asset.allAssets[i].id === asset.asset &&
                    (asset.published || asset.allAssets[i].posted !== undefined)) {
                    asset.allAssets[i].tags = result.rows;
                }
            }

            cb();
        });
}

function addTagsToAssets(db, req, res, assetInfo, results, assets, totalAssets, published, cb)
{
    var error;
    function errorReporter(err) {
        error = err;
    }

    var queue = async.queue(assetTagFetcher, 2);
    var tasks = [];
    queue.drain = function() {
        if (error) {
            cb(error);
        } else {
            cb(null, db, req, res, assetInfo, assets, totalAssets);
        }
    };

    for (var i = 0; i < results.rowCount; ++i) {
        var asset = results.rows[i];
        asset.tags = [];

        var task = {
            'db': db,
            'req': req,
            'res': res,
            'asset': asset.id,
            'published': published,
            'allAssets': assets
        };

        tasks.push(task);
    }

    if (tasks.length > 0) {
        queue.push(tasks, errorReporter);
    } else {
        cb(null, db, req, res, assetInfo, assets, totalAssets);
    }
}

function countPublishedAssets(db, req, res, assetInfo, assets, totalAssets, cb)
{
    var query = 'select count(*) as totalAssets, \'published\' as status from assets where active';
    var args = [];
    var e;

    var i = 1;
    if (assetInfo.partner > 0) {
        query += ' and partner = $' + i;
        args.push(assetInfo.partner);
        ++i
    }

    db.query(query, args, function(err, results) {
        if (err) {
            e = errors.create('Database', err.message);
            cb(e, db, req, res, assetInfo, assets, totalAssets);
            return;
        }

        totalAssets += utils.parseNumber(results.rows[0].totalassets);

        cb(null, db, req, res, assetInfo, assets, totalAssets);
    });
}

function findPublishedAssets(db, req, res, assetInfo, assets, totalAssets, cb)
{
    var query = 'select *, \'published\' as status from assets where active';
    var args = [];
    var e;

    var i = 1;
    if (assetInfo.partner > 0) {
        query += ' and partner = $' + i;
        args.push(assetInfo.partner);
        ++i
    }

    query += ' limit $' + i + ' offset $' + (++i);
    //take an arbitrary limit if not specified
    if (req.query.limit) {
        args.push(Math.min(100, utils.parseNumber(req.query.limit)));
    } else {
        args.push(100);
    }
    args.push(utils.parseNumber(req.query.start));

    db.query(query, args, function(err, results) {
        if (err) {
            e = errors.create('Database', err.message);
            cb(e, db, req, res, assetInfo, assets, totalAssets);
            return;
        }

        assets = assets.concat(results.rows);
        JSON.stringify(assets, 0, 2);
        addTagsToAssets(db, req, res, assetInfo, results, assets, totalAssets, true, cb);
    });
}

function countIncomingAssets(db, req, res, assetInfo, assets, totalAssets, cb)
{
    var query = 'select count(*) as totalAssets from incomingAssets';
    var args = [];
    var e;

    if (assetInfo.partner > 0) {
        query += ' where partner = $1';
        args.push(assetInfo.partner);
    }

    db.query(query, args, function(err, results) {
        if (err) {
            e = errors.create('Database', err.message);
            cb(e, db, req, res, assetInfo, assets, totalAssets);
            return;
        }

        totalAssets += utils.parseNumber(results.rows[0].totalassets);

        cb(null, db, req, res, assetInfo, assets, totalAssets);
    });
}

function findIncomingAssets(db, req, res, assetInfo, assets, totalAssets, cb)
{
    var query = 'select *, (case when posted = true then \'posted\' else \'incoming\' end) status from incomingAssets';
    var args = [];
    var e;

    var i = 1;
    if (assetInfo.partner > 0) {
        query += ' where partner = $' + i;
        args.push(assetInfo.partner);
        ++i
    }

    query += ' limit $' + i + ' offset $' + (++i);
    //take an arbitrary limit if not specified
    if (req.query.limit) {
        args.push(Math.min(100, utils.parseNumber(req.query.limit)));
    } else {
        args.push(100);
    }
    args.push(utils.parseNumber(req.query.start));

    db.query(query, args, function(err, results) {
        if (err) {
            e = errors.create('Database', err.message);
            cb(e, db, req, res, assetInfo, assets, totalAssets);
            return;
        }

        assets = assets.concat(results.rows);
        JSON.stringify(assets, 0, 2);
        addTagsToAssets(db, req, res, assetInfo, results, assets, totalAssets, false, cb);
    });
}

function countPostedAssets(db, req, res, assetInfo, assets, totalAssets, cb)
{
    var query = 'select count(*) as totalAssets from incomingAssets where posted';
    var args = [];
    var e;

    if (assetInfo.partner > 0) {
        query += ' and partner = $1';
        args.push(assetInfo.partner);
    }

    db.query(query, args, function(err, results) {
        if (err) {
            e = errors.create('Database', err.message);
            cb(e, db, req, res, assetInfo, assets, totalAssets);
            return;
        }

        totalAssets += utils.parseNumber(results.rows[0].totalassets);

        cb(null, db, req, res, assetInfo, assets, totalAssets);
    });
}

function findPostedAssets(db, req, res, assetInfo, assets, totalAssets, cb)
{
    var query = 'select *, \'posted\' as status from incomingAssets where posted';
    var args = [];
    var e;

    var i = 1;
    if (assetInfo.partner > 0) {
        query += ' and partner = $' + i;
        args.push(assetInfo.partner);
        ++i
    }

    query += ' limit $' + i + ' offset $' + (++i);
    //take an arbitrary limit if not specified
    if (req.query.limit) {
        args.push(Math.min(100, utils.parseNumber(req.query.limit)));
    } else {
        args.push(100);
    }
    args.push(utils.parseNumber(req.query.start));


    db.query(query, args, function(err, results) {
        if (err) {
            e = errors.create('Database', err.message);
            cb(e, db, req, res, assetInfo, assets, totalAssets);
            return;
        }
        assets = assets.concat(results.rows);
        addTagsToAssets(db, req, res, assetInfo, results, assets, totalAssets, false, cb);
    });
}


function checkIfIsValidator(db, req, res, assetInfo, assets, totalAssets, cb)
{
    createUtils.isValidator(
        db, req, res, assetInfo,
        function(err, db, req, res, assetInfo) {
            var e;
            if (err) {
                e = errors.create('PartnerRoleMissing', err.message);
                cb(e, db, req, res, assetInfo, assets, totalAssets);
                return;
            }
            cb(null, db, req, res, assetInfo, assets, totalAssets);
        });
}

function checkPartnerRole(db, req, res, assetInfo, assets, totalAssets, cb)
{
    createUtils.isContentCreator(
        db, req, res, assetInfo,
        function(err, db, req, res, assetInfo) {
            var e;
            if (err) {
                checkIfIsValidator(db, req, res, assetInfo, assets, totalAssets, cb);
                return;
            }
            cb(null, db, req, res, assetInfo, assets, totalAssets);
        });
}

module.exports = function(db, req, res) {
    var assetInfo = {};
    var funcs = [];
    var assets = [];
    var totalAssets = 0;

    if (req.params.type &&
        req.params.type !== 'published' &&
        req.params.type !== 'incoming' &&
        req.params.type !== 'posted' &&
        req.params.type !== 'all') {
        errors.report('InvalidAssetListing', req, res);
        return;
    }

    funcs.push(function (callback) {
        callback(null, db, req, res, assetInfo, assets, totalAssets);
    });

    assetInfo.partner = utils.parseNumber(req.params.partnerId);
    funcs.push(checkPartnerRole);

    switch (req.params.type) {
    case 'all':
        funcs.push(countPublishedAssets);
        funcs.push(findPublishedAssets);
        funcs.push(countIncomingAssets);
        funcs.push(findIncomingAssets);
        break;
    case 'incoming':
        funcs.push(findIncomingAssets);
        break;
    case 'published':
        funcs.push(countPublishedAssets);
        funcs.push(findPublishedAssets);
        break;
    case 'posted':
        funcs.push(countPostedAssets);
        funcs.push(findPostedAssets);
        break;
    default:
        /* By default show only published assets */
        funcs.push(countPublishedAssets);
        funcs.push(findPublishedAssets);
        break;
    }

    async.waterfall(funcs, sendResponse);
};
