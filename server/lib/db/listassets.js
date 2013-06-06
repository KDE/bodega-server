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

function sendResponse(db, req, res, assetInfo)
{
    var json = utils.standardJson(req, true);

    json.asset = {
        id : assetInfo.id,
        name : assetInfo.name
    };
    res.send(json);
}

function sendResponse(err, db, req, res, partner, assets)
{
    if (err) {
        errors.report(err.name, req, res, err);
    } else {
        var json = utils.standardJson(req, true);
        json.assets = assets;
        res.send(json);
    }
}

function findPublishedAssets(db, req, res, partner, assets, cb)
{
    var query = 'select * from assets where partner=$1 and active=true';
    var e;

    db.query(query, [partner], function(err, results) {
        if (err) {
            e = errors.create('Database', err.message);
            cb(e, db, req, res, partner, assets);
            return;
        }
        assets = assets.concat(results.rows);
        cb(null, db, req, res, partner, assets);
    });
}

function findIncomingAssets(db, req, res, partner, assets, cb)
{
    var query = 'select * from incomingAssets where partner=$1';
    var e;

    db.query(query, [partner], function(err, results) {
        if (err) {
            e = errors.create('Database', err.message);
            cb(e, db, req, res, partner, assets);
            return;
        }

        assets = assets.concat(results.rows);
        cb(null, db, req, res, partner, assets);
    });
}

module.exports = function(db, req, res) {
    var assetInfo = {};
    var funcs = [];
    var assets = [];

    if (req.params.type &&
        req.params.type !== 'published' &&
        req.params.type !== 'incoming' &&
        req.params.type !== 'all') {
        errors.report('InvalidAssetListing', req, res);
        return;
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
    default:
        /* By default show only published assets */
        funcs.push(findPublishedAssets);
        break;
    }

    createUtils.isContentCreator(
        db, req, res, assetInfo,
        function(err, db, req, res, assetInfo) {
            if (err) {
                errors.report('ListAssetsInvalidPartner', req, res, err);
                return;
            }
            /* Our starter function that just passes the things we need */
            funcs.unshift(function (callback) {
                callback(null, db, req, res, assetInfo.partner, assets);
            });
            async.waterfall(funcs, sendResponse);
        });
};
