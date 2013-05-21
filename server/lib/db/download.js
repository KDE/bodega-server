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

function launchDownload(db, req, res)
{
    var assetInfoQuery =
        "SELECT a.id, a.author as partnerId, a.version, a.path, a.file, a.name \
         FROM assets a LEFT JOIN channelAssets c ON (a.id = c.asset)  \
         LEFT JOIN storeChannels sc ON (sc.channel = c.channel) \
         WHERE a.id = $1 and sc.store = $2";

    var q = db.query(
        assetInfoQuery, [req.params.assetId, req.session.user.store],
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }
            if (!result || !result.rows || result.rows.length !== 1) {
                //"Could not find the specified asset.",
                errors.report('NoMatch', req, res);
                return;
            }
            app.assetStore.download(res, result.rows[0].path, result.rows[0].file, function(err) {
                if (err) {
                    errors.report('Download', req, res, err);
                    return;
                }

                utils.recordDownload(db, req);
            });
        });
}

module.exports = function(db, req, res) {
    var q = db.query("SELECT ct_canDownload($1, $2, $3) as allowed;",
                     [req.session.user.id, req.session.user.store, req.params.assetId],
                     function(err, result) {
                        if (err || !result || result.rows.length < 1) {
                            errors.report('Database', req, res, err);
                            return;
                        }

                        if (!result.rows[0].allowed) {
                            //"Access denied to requested asset.",
                            errors.report('AccessDenied', req, res);
                            return;
                        }

                        launchDownload(db, req, res);
                     });
};
