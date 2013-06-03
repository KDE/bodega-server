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

function addChangelogAndFinish(db, req, res, json)
{
    var tagsQuery =
        "SELECT version, versionts as timestamp, changes FROM assetChangelogs log \
         WHERE log.asset=$1 AND log.changes IS NOT NULL ORDER BY versionts;";

    var q = db.query(
        tagsQuery, [req.params.assetId],
        function(err, result) {
            var i;
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }
            json.asset.changelog = {};
            if (result && result.rows.length > 0) {
                for (i = 0; i < result.rows.length; ++i) {
                    var obj = {
                        timestamp : result.rows[i].timestamp,
                        changes   : result.rows[i].changes
                    };
                    json.asset.changelog[result.rows[i].version] = obj;
                }
            }
            res.json(json);
        }
    );
}

function addPreviewsAndFinish(db, req, res, json)
{
    var pathQuery =
        "SELECT path FROM assetPreviews p WHERE p.asset=$1;";

    var q = db.query(
        pathQuery, [req.params.assetId],
        function(err, result) {
            var i;
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }
            json.asset.previews = [];
            if (result && result.rows.length > 0) {
                for (i = 0; i < result.rows.length; ++i) {
                    json.asset.previews.push(result.rows[i]);
                }
            }
            if (req.query.changelog) {
                addChangelogAndFinish(db, req, res, json);
            } else {
                res.json(json);
            }
        }
    );
}


function addTagsAndFinish(db, req, res, json)
{
    var tagsQuery =
        "SELECT tagTypes.type, tags.title FROM assetTags a JOIN tags ON \
         (a.tag = tags.id) LEFT JOIN tagTypes ON \
         (tags.type = tagTypes.id) where a.asset = $1;";

    var q = db.query(
        tagsQuery, [req.params.assetId],
        function(err, result) {
            var i;
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }
            json.asset.tags = [];
            if (result && result.rows.length > 0) {
                for (i = 0; i < result.rows.length; ++i) {
                    var obj = {};
                    obj[result.rows[i].type] = result.rows[i].title;
                    json.asset.tags.push(obj);
                }
            }

            if (req.query.previews) {
                addPreviewsAndFinish(db, req, res, json);
            } else if (req.query.changelog) {
                addChangelogAndFinish(db, req, res, json);
            } else {
                res.json(json);
            }
        }
    );
}

module.exports = function(db, req, res) {
    var assetInfoQuery =
        "SELECT a.id, l.name as license, l.text as licenseText, a.partner as partnerId, a.version, a.file, \
         a.image, a.name, a.description, ct_canDownload($3, $2, $1) AS downloadable, ct_assetPrice($2, $1) AS price \
         FROM assets a LEFT JOIN channelAssets ca ON (a.id = ca.asset)  \
                       LEFT JOIN channels c ON (ca.channel = c.id)  \
                       LEFT JOIN licenses l ON (a.license = l.id) \
         WHERE a.id = $1 AND c.store = $2";

    var q = db.query(
        assetInfoQuery, [req.params.assetId, req.session.user.store, req.session.user.id],
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }

            var json = utils.standardJson(req);
            if (!result || result.rows.length <= 0) {
                res.json(json);
                return;
            }

            json.asset = {
                id :         result.rows[0].id,
                license:     result.rows[0].license,
                licenseText: result.rows[0].licenseText,
                partnerId:   result.rows[0].partnerid,
                version:     result.rows[0].version,
                filename:    result.rows[0].file,
                image:       result.rows[0].image,
                name:        result.rows[0].name,
                description: result.rows[0].description,
                points:      result.rows[0].price,
                canDownload: result.rows[0].downloadable
            };

            addTagsAndFinish(db, req, res, json);
        });
};
