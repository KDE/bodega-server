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

var errors = require('../errors.js');
var utils = require('../utils.js');
var fs = require('fs');

function checkPartner(db, req, res)
{
    //console.log("checking " + req.body.partner + ' ' + req.session.user.id);
    var partner = req.body.partner;
    if (partner === null) {
        db.query("select partner from affiliations a left join personRoles r on (a.role = r.id) where a.person = $1 and r.description = 'Content Creator';",
                [req.session.user.id],
                function(err, result) {
                    if (err || !result.rows || result.rows.length === 0) {
                        errors.report('UploadPartnerInvalid', req, res);
                        return;
                    }

                    req.body.partner = result.rows[0].partner;
                    storeAsset(db, req, res);
                });
    } else {
        //console.log("checking up on partner");
        db.query("select partner from affiliations a left join personRoles r on (a.role = r.id) where a.partner = $1 and a.person = $2 and r.description = 'Content Creator';",
                [req.body.partner, req.session.user.id],
                function(err, result) {
                    if (err || !result.rows || result.rows.length === 0) {
                        console.log("didn't find partner");
                        errors.report('UploadPartnerInvalid', req, res);
                        return;
                    }

                    console.log("going to store the asset now .. " + req.body.partner + " " + result.rows.size);
                    storeAsset(db, req, res);
                });
    }
}

function storeAsset(db, req, res)
{
    console.log("storing asset...");
    db.query("select nextval('seq_assetsids') as assetId;", [],
             function(err, result) {
                 req.files.asset.id = result.rows[0].assetid;
                 app.assetStore.upload(req,
                     function(err, result) {
                         if (err) {
                             //console.log("error due to bad rename?");
                             errors.report('UploadFailed', req, res);
                             return;
                         }

                         req.files.asset.incomingPath = result.path;
                         recordAsset(db, req, res);
                     });
            });
}

function recordAsset(db, req, res)
{
    var file = req.files.asset;
    var incomingPath = file.incomingPath;
    //console.log(req.session.user.id, "our paths are => " + file.filename + ' ' + incomingPath);
    var newAssetQuery = 'insert into incomingAssets (author, name, file, path) values ($1, $2, $3, $4)';
    db.query(newAssetQuery, [req.body.partner, file.filename, file.filename, incomingPath],
            function(err, result) {
                if (err) {
                    errors.report('Database', req, res, err);
                    return;
                }

                var json = {
                    device : req.session.user.device,
                    authStatus : req.session.authorized,
                    points : req.session.user.points,
                    asset : req.files.asset.id
                };

                res.json(json);
            });
};

module.exports = function(db, req, res) {
    //console.log("start ");

    var file = req.files.asset;
    if (!file || file['size'] < 1 || file['filename'].length === 0) {
        //console.log("error due to bad file");
        errors.report('UploadFailed', req, res);
        return;
    }

    checkPartner(db, req, res);
    /*
    console.log("path = "  + req.files.asset['path']);
    console.log("size = "  + req.files.asset['size']);
    console.log("filename = "  + req.files.asset.filename);
    console.log("length = "  + req.files.asset['length']);
    */
}

