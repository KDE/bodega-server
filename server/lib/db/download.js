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
        "SELECT a.id, a.partner as partnerId, a.version, a.externpath, a.file, a.name \
         FROM assets a LEFT JOIN channelAssets ca ON (a.id = ca.asset)  \
         LEFT JOIN channels c ON (c.id = ca.channel) \
         WHERE a.id = $1 and c.store = $2";
    var args = [req.params.assetId, req.session.user.store];

    db.query(assetInfoQuery, args, function(err, result) {
        var assetInfo;
        if (err) {
            errors.report('Database', req, res, err);
            return;
        }
        if (!result || !result.rows || result.rows.length < 1) {
            //"Could not find the specified asset.",
            errors.report('NoMatch', req, res);
            return;
        }

        assetInfo = result.rows[0];
        app.assetStore.download(res, assetInfo, function(err) {
            if (err) {
                errors.report('Download', req, res, err);
                return;
            }

            var ip = req.headers['x-forwarded-for'];
            if (!ip) {
                ip = req.connection.socket ? req.connection.socket.remoteAddress
                : req.connection.remoteAddress;
                if (!ip) {
                    ip = "0.0.0.0";
                }
            }

            db.query("SELECT ct_recordDownload($1, $2, $3, $4);",
                     [req.session.user.id, req.params.assetId, ip, req.session.user.store]);
        });
    });
}


function launchIncomingDownload(db, req, res)
{
    var assetInfoQuery =
        "SELECT a.id, a.partner as partnerId, a.version, a.externpath, a.file, a.name \
         FROM incomingAssets a WHERE a.id = $1";
    var args = [req.params.assetId];

    db.query(assetInfoQuery, args, function(err, result) {
        var assetInfo;
        if (err) {
            errors.report('Database', req, res, err);
            return;
        }
        if (!result || !result.rows || result.rows.length < 1) {
            //"Could not find the specified asset.",
            errors.report('NoMatch', req, res);
            return;
        }
        assetInfo = result.rows[0];
        assetInfo.incoming = true;
        app.assetStore.download(res, assetInfo, function(err) {
            if (err) {
                errors.report('Download', req, res, err);
                return;
            }

            //nothing. we don't record downloads of an incoming asset
        });
    });
}

module.exports = function(db, req, res) {
    var isIncoming = req.query.incoming !== undefined;
    var e;
    var query, args;

    if (isIncoming) {
        query = "SELECT ct_canDownloadIncoming($1, $2) as allowed;";
        args = [req.session.user.id,
                req.params.assetId];
    } else {
        query = "SELECT ct_canDownload($1, $2, $3) as allowed;";
        args = [req.session.user.id,
                req.session.user.store,
                req.params.assetId];
    }

    db.query(query, args, function(err, result) {
        if (err || !result || result.rows.length < 1) {
            errors.report('Database', req, res, err);
            return;
        }

        if (!result.rows[0].allowed) {
            //"Access denied to requested asset.",
            errors.report('AccessDenied', req, res);
            return;
        }

        if (isIncoming) {
            launchIncomingDownload(db, req, res);
        } else {
            launchDownload(db, req, res);
        }
    });
};
