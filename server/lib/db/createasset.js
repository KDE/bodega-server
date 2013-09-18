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
var fs = require('fs');
var path = require('path');

function sendResponse(db, req, res, assetInfo)
{
    var json = utils.standardJson(req);
    json.asset = {
        id : utils.parseNumber(assetInfo.id),
        name : assetInfo.name
    };
    res.send(json);
}


function reportError(db, req, res, assetInfo,
                     errorType, error)
{
    errors.report(errorType, req, res, error);
}

function setupTags(db, req, res, assetInfo)
{
    if (assetInfo.tags) {
        createUtils.setupTags(
            db, req, res, assetInfo,
            function(err, db, req, res, assetInfo) {
                if (err) {
                    reportError(db, req, res, assetInfo,
                               'UploadTagError', err);
                    return;
                }
                sendResponse(db, req, res, assetInfo);
            });
    } else {
        sendResponse(db, req, res, assetInfo);
    }
}

function setupPreviews(db, req, res, assetInfo)
{
    if (assetInfo.previews) {
        createUtils.setupPreviews(
            db, req, res, assetInfo,
            function(err) {
                if (err) {
                    reportError(db, req, res, assetInfo,
                                'UploadPreviewError', err);
                    return;
                }
                setupTags(db, req, res, assetInfo);
            });
    } else {
        setupTags(db, req, res, assetInfo);
    }
}


function recordAsset(db, req, res, assetInfo)
{
    var newAssetQuery = 'insert into incomingAssets (id, license, partner, baseprice, name, description, version, file, size) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)';
    var args = [assetInfo.id, assetInfo.license, assetInfo.partner,
                assetInfo.basePrice, assetInfo.name, assetInfo.description,
                assetInfo.version, assetInfo.file, assetInfo.size];
    db.query(newAssetQuery, args, function(err, result) {
        if (err) {
            reportError(db, req, res, assetInfo,
                        'Database', err);
            return;
        }
        setupPreviews(db, req, res, assetInfo);
    });
}

function storeAsset(db, req, res, assetInfo)
{
    var query = "select nextval('seq_assetsids') as assetId;";
    db.query(query, [], function(err, result) {
        var fromFile = req.files.asset.path;
        assetInfo.id = result.rows[0].assetid;
        app.assetStore.upload(
            fromFile, assetInfo,
            function(err) {
                if (err) {
                    //console.log("error due to bad rename?");
                    reportError(db, req, res, assetInfo,
                                'UploadFailed', err);
                    return;
                }
                recordAsset(db, req, res, assetInfo);
            });
    });
}

function processInfo(assetInfo, db, req, res)
{
    if (!assetInfo || !assetInfo.file || assetInfo.id) {
        //"Unable to parse the asset info file.",
        errors.report('UploadInvalidJson', req, res);
        return;
    }
    assetInfo.incoming = true;
    createUtils.isContentCreator(db, req, res, assetInfo, function(err) {
        if (err) {
            errors.report('PartnerInvalid', req, res, err);
            return;
        }
        storeAsset(db, req, res, assetInfo);
    });
}

module.exports = function(db, req, res) {
    // asset info
    //   icons
    //   previews
    //   asset
    createUtils.findAssetInfo(req, function(err, assetInfo) {
        if (err) {
            errors.report(err.name, req, res, err.message);
            return;
        }

        processInfo(assetInfo, db, req, res);
    });
};
