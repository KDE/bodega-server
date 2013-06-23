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
    db.query(newAssetQuery,
             [assetInfo.id, assetInfo.license, assetInfo.partner, assetInfo.basePrice, assetInfo.name, assetInfo.description, assetInfo.version, assetInfo.file, assetInfo.size],
             function(err, result) {
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
    db.query("select nextval('seq_assetsids') as assetId;", [],
             function(err, result) {
                 var fromFile = req.files.asset.path;
                 var name = req.files.asset.name;
                 assetInfo.id = result.rows[0].assetid;
                 //console.log(req.files.asset);
                 //console.log("from file " + fromFile + ", id = " + assetInfo.id + ', filename = ' + assetInfo.file);
                 //console.log('file size = ' + req.files.asset.size);
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

function checkPartner(db, req, res, assetInfo)
{
    //console.log("checking " + assetInfo.partner + ' ' + req.session.user.id);
    var partner = assetInfo.partner;
    if (!partner) {
        db.query("select partner from affiliations a left join personRoles r on (a.role = r.id) where a.person = $1 and r.description = 'Content Creator';",
                 [req.session.user.id],
                 function(err, result) {
                     if (err || !result.rows || result.rows.length === 0) {
                         reportError(db, req, res, assetInfo,
                                     'InvalidPartner', err);
                         return;
                     }

                     assetInfo.partner = result.rows[0].partner;
                     storeAsset(db, req, res, assetInfo);
                 });
    } else {
        //console.log("checking up on partner");
        db.query("select partner from affiliations a left join personRoles r on (a.role = r.id) where a.partner = $1 and a.person = $2 and r.description = 'Content Creator';",
                 [partner, req.session.user.id],
                 function(err, result) {
                     if (err || !result.rows || result.rows.length === 0) {
                         reportError(db, req, res, assetInfo,
                                     'PartnerInvalid', err);
                         return;
                     }

                     //console.log("going to store the asset now .. " + partner + " " + result.rows.length);
                     storeAsset(db, req, res, assetInfo);
                 });
    }
}

function processInfo(data, db, req, res)
{
    var assetInfo;
    try {
        assetInfo = JSON.parse(data);
    } catch (err) {
        //JSON parser failed
        assetInfo = null;
    }

    if (!assetInfo || !assetInfo.file || assetInfo.id) {
        //"Unable to parse the asset info file.",
        errors.report('UploadInvalidJson', req, res);
        return;
    }
    assetInfo.incoming = true;
    checkPartner(db, req, res, assetInfo);
}

module.exports = function(db, req, res) {
    // asset info
    //   icons
    //   previews
    //   asset

    if (req.body.info) {
        processInfo(req.body.info, db, req, res);
    } else if (req.files && req.files.info) {
        fs.readFile(req.files.info.path, function(err, data) {
            if (err) {
                errors.report('UploadInvalidJson', req, res, err);
                return;
            }

            processInfo(data, db, req, res);
        });
    } else {
        //"The asset info is missing.",
        errors.report('MissingParameters', req, res);
        return;
    }
};
