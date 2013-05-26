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
    var query = "SELECT count(*) AS assets, \
            sum(points) AS totalpoints, \
            sum(toparticipant) AS pointstoparticipant, \
            sum(toStore) AS pointstostore \
    FROM purchases, devices \
    WHERE purchases.device = devices.partnumber \
    AND devices.partner = $1;";

    var json = {
        device : req.session.user.device,
        authStatus : req.session.authorized,
        points : req.session.user.points,
        channels : [],
        assets   : []
    };

    db.query(
        query,
        [req.session.user.id],
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }
            json.stats = result.rows[0];
            res.json(json);
        });
};
