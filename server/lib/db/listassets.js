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

function sendResponse(err, db, req, res, assetInfo, assets)
{
    if (err) {
        errors.report(err.name, req, res, err);
    } else {
        var json = utils.standardJson(req, true);
        json.assets = assets;
        res.send(json);
    }
}


function tagFetcher(asset, cb)
{
    asset.db.query('select tags.id, tagtypes.id as typeid, tagtypes.type as type, title \
          from assettags join tags on assettags.tag = tags.id \
          join tagtypes on tagtypes.id = tags.type \
          where asset = $1',
        [asset.asset],
        function (err, result) {
            if (err) {
                cb(errors.create('Database', err.message));
                return;
            }

            for (var i = 0; i < asset.allAssets.length; ++i) {
                if (asset.allAssets[i].id === asset.asset) {
                    asset.allAssets[i].tags = result.rows;
                }
            }
            cb();
        });
}

function addTagsToAssets(db, req, res, assetInfo, results, assets, cb) {

    function errorReporter(err) {
        error = err;
    }

    var queue = async.queue(tagFetcher, 2);
    var tasks = [];
    queue.drain = function() {
        if (error) {
            errors.report(error.type, req, res, error);
        } else {
            cb(null, db, req, res, assetInfo, assets);
        }
    };

    for (var i = 0; i < results.rowCount; ++i) {
        var asset = results.rows[i];
        asset.tags = [];
        assets.push(asset);

        var task = {
            'db': db,
            'req': req,
            'res': res,
            'asset': asset.id,
            'allAssets': assets
        };

        tasks.push(task);
    }

    queue.push(tasks, errorReporter);
}

function findPublishedAssets(db, req, res, assetInfo, assets, cb)
{
    var query = 'select * from assets where partner=$1 and active=true';
    var e;

    db.query(query, [assetInfo.partner], function(err, results) {
        if (err) {
            e = errors.create('Database', err.message);
            cb(e, db, req, res, assetInfo, assets);
            return;
        }


        addTagsToAssets(db, req, res, assetInfo, results, assets, cb);
    });
}

function findIncomingAssets(db, req, res, assetInfo, assets, cb)
{
    var query = 'select * from incomingAssets where partner=$1';
    var e;

    db.query(query, [assetInfo.partner], function(err, results) {
        if (err) {
            e = errors.create('Database', err.message);
            cb(e, db, req, res, assetInfo, assets);
            return;
        }

        addTagsToAssets(db, req, res, assetInfo, results, assets, cb);
    });
}

function findPostedAssets(db, req, res, assetInfo, assets, cb)
{
    var query = 'select * from incomingAssets where posted=true';
    var e;

    db.query(query, [], function(err, results) {
        if (err) {
            e = errors.create('Database', err.message);
            cb(e, db, req, res, assetInfo, assets);
            return;
        }

        addTagsToAssets(db, req, res, assetInfo, results, assets, cb);
    });
}


function checkIfIsContentCreator(db, req, res, assetInfo, assets, cb)
{
    createUtils.isContentCreator(
        db, req, res, assetInfo,
        function(err, db, req, res, assetInfo) {
            var e;
            if (err) {
                e = errors.create('PartnerInvalid', err.message);
                cb(e, db, req, res, assetInfo, assets);
                return;
            }
            cb(null, db, req, res, assetInfo, assets);
        });
}

function checkIfIsValidator(db, req, res, assetInfo, assets, cb)
{
    createUtils.isValidator(
        db, req, res, assetInfo,
        function(err, db, req, res, assetInfo) {
            var e;
            if (err) {
                e = errors.create('NotAValidator', err.message);
                cb(e, db, req, res, assetInfo, assets);
                return;
            }
            cb(null, db, req, res, assetInfo, assets);
        });
}

module.exports = function(db, req, res) {
    var assetInfo = {};
    var funcs = [];
    var assets = [];

    if (req.params.type &&
        req.params.type !== 'published' &&
        req.params.type !== 'incoming' &&
        req.params.type !== 'posted' &&
        req.params.type !== 'all') {
        errors.report('InvalidAssetListing', req, res);
        return;
    }

    funcs.push(function (callback) {
        callback(null, db, req, res, assetInfo, assets);
    });

    if (req.params.type === 'posted') {
        funcs.push(checkIfIsValidator);
    } else {
        funcs.push(checkIfIsContentCreator);
    }

    switch (req.params.type) {
    case 'all':
        funcs.push(findPublishedAssets);
        funcs.push(findIncomingAssets);
        break;
    case 'incoming':
        funcs.push(findIncomingAssets);
        break;
    case 'published':
        funcs.push(findPublishedAssets);
        break;
    case 'posted':
        funcs.push(findPostedAssets);
        break;
    default:
        /* By default show only published assets */
        funcs.push(findPublishedAssets);
        break;
    }

    async.waterfall(funcs, sendResponse);
};
