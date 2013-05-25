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
    var json = utils.standardJson(req, true);

    json.asset = {
        id : assetInfo.id,
        name : assetInfo.name
    };
    res.send(json);
}

function deleteFile(db, req, res, path)
{
    app.assetStore.remove(path, function() {});
}

function deleteFiles(db, req, res, assetInfo)
{
    var i;
    deleteFiles(db, req, res, assetInfo.path);
    for (i = 0; assetInfo.previews.length; ++i) {
        deleteFiles(db, req, res, assetInfo.previews[i].path);
    }
    sendResponse(db, req, res, assetInfo);
}

function deleteAsset(db, req, res, assetInfo, queries)
{
    db.query(
        queries.deleteAsset, [assetInfo.id],
        function(err, result) {
            var i;
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }
            assetInfo.previews = result.rows;
            if (!assetInfo.previews) {
                assetInfo.previews = [];
            }
            deleteFiles(db, req, res, assetInfo, queries);
        }
    );
}

function findPreviewFiles(db, req, res, assetInfo, queries)
{
    assetInfo.previews = [];
    db.query(
        queries.findPreviews, [assetInfo.id],
        function(err, result) {
            var i;
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }
            assetInfo.previews = result.rows;
            if (!assetInfo.previews) {
                assetInfo.previews = [];
            }
            deleteAsset(db, req, res, assetInfo, queries);
        }
    );
}

function deletePublishedAsset(db, req, res, assetInfo)
{
    //find previews query
    var queries = {
        findPreviews :
        "select * from incomingassetpreviews where asset = $1;",
        deleteAsset :
        "update assets set active = FALSE where id = $1;"
    };
    findPreviewFiles(db, req, res, assetInfo);
}

function deleteIncomingAsset(db, req, res, assetInfo)
{
    var queries = {
        findPreviews :
        "select * from incomingassetpreviews where asset = $1;",
        deleteAsset :
        "delete from incomingassets where id = $1;"
    };
    findPreviewFiles(db, req, res, assetInfo);
}

function findPublishedAsset(db, req, res, assetInfo)
{
    var q = "select * from assets where id = $1 and author = $2;";
    db.query(
        q, [assetInfo.id, assetInfo.partnerId],
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }
            if (!result.rows || result.rows.length != 1) {
                errors.report('DeleteAssetMissing', req, res);
                return;
            } else {
                assetInfo = result.rows[0];
                deletePublishedAsset(db, req, res, assetInfo);
            }
        }
    );
}

function findIncomingAsset(db, req, res, assetInfo)
{
    var q = "select * from incomingAssets where id = $1 and author = $2;";
    db.query(
        q, [assetInfo.id, assetInfo.partnerId],
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }
            if (!result.rows || result.rows.length != 1) {
                findPublishedAsset(db, req, res, assetInfo);
            } else {
                assetInfo = result.rows[0];
                deleteIncomingAsset(db, req, res, assetInfo);
            }
        }
    );
}

function checkPartner(db, req, res, assetInfo)
{
    //console.log("checking " + assetInfo.partnerId + ' ' + req.session.user.id);
    var partner = assetInfo.partnerId;
    if (!partner) {
        db.query("select partner from affiliations a left join personRoles r on (a.role = r.id) where a.person = $1 and r.description = 'Content Creator';",
                 [req.session.user.id],
                 function(err, result) {
                     if (err || !result.rows || result.rows.length === 0) {
                         reportError(db, req, res, assetInfo,
                                     'UploadPartnerInvalid', err);
                         return;
                     }

                     assetInfo.partnerId = result.rows[0].partner;
                     storeAsset(db, req, res, assetInfo);
                 });
    } else {
        //console.log("checking up on partner");
        db.query("select partner from affiliations a left join personRoles r on (a.role = r.id) where a.partner = $1 and a.person = $2 and r.description = 'Content Creator';",
                 [partner, req.session.user.id],
                 function(err, result) {
                     if (err || !result.rows || result.rows.length === 0) {
                         reportError(db, req, res, assetInfo,
                                     'UploadPartnerInvalid', err);
                         return;
                     }

                     //console.log("going to store the asset now .. " + partner + " " + result.rows.length);
                     storeAsset(db, req, res, assetInfo);
                 });
    }
}

module.exports = function(db, req, res) {
    var assetInfo = {};

    if (!req.params.assetId) {
        errors.report('MissingParameters', req, res);
        return;
    }
    assetInfo.id = req.params.assetId;
    assetInfo.partnerId = req.params.partnerId;

    createUtils.isContentCreator(
        db, req, res, assetInfo,
        function(err, db, req, res, assetInfo) {
            if (err) {
                errors.report('UploadPartnerInvalid', req, res, err);
                return;
            }
            findIncomingAsset(db, req, res, assetInfo);
            deleteIncomingAsset();
            deletePublishedAsset();
        });
};
