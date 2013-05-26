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

module.exports.assetStats = function(db, req, res) {
    var params = [req.session.user.id];

    var query = "SELECT count(*) AS assets, \
            sum(points) AS totalpoints, \
            sum(toparticipant) AS pointstoparticipant, \
            sum(toStore) AS pointstostore \
    FROM purchases, devices \
    WHERE purchases.device = devices.partnumber \
    AND devices.partner = $1";

    if (req.query.assets) {
        params = params.concat(req.query.assets);
        query += " AND (";

        for (var i = 0; i < req.query.assets.length; ++i){
            query += (i > 0 ? " OR ":"") + " purchases.asset = $" + (i+2);
        }

        query += ") GROUP BY purchases.asset";
    }

    query += ";";

    var json = {
        device : req.session.user.device,
        authStatus : req.session.authorized,
        points : req.session.user.points,
        channels : [],
        stats   : []
    };

    db.query(
        query,
        params,
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }
            json.stats = result.rows;
            res.json(json);
        });
};
