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

    if (!req.query.assets) {
        return;
    }

    params = params.concat(req.query.assets);

    var assetsPlaceholders = "";
    for (var i = 0; i < req.query.assets.length; ++i) {
        assetsPlaceholders += (i > 0 ? ", ":"") + "$" + (i+1);
    }

    var query = "select date_trunc('month', p.purchasedon) dateOf,"
    
    for (var i = 0; i < req.query.assets.length; ++i) {
        query += "SUM(CASE WHEN asset = $" + (i+2) + " THEN p.toparticipant ELSE 0 END) AS asset" + req.query.assets[i];
        if (i < req.query.assets.length - 1) {
            query += ", ";
        }
    }

    query += " from purchases p left join assets a on (p.asset = a.id and a.author = $1) where asset in (";
    for (var i = 0; i < req.query.assets.length; ++i) {
        query += (i > 0 ? ", ":"") + "$" + (i+1);
    }
    query += ") group by dateOf order by dateOf;";
    
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
