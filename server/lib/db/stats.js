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
    var params = [req.session.user.partner];

    var i;
    var query = "";
    //default granularity is month
    var granularity = "month";

    //only other two allowed values are year and day
    if (req.query.granularity === "day") {
        granularity = "day";
    } else if (req.query.granularity === "year") {
        granularity = "year";
    }

    if (req.query.assets && req.query.assets.length > 0) {
            query += "select dateof";

            for (i = 0; i < req.query.assets.length; ++i) {
                query += ", asset" + req.query.assets[i];
            }
            query += " from (";
    } else {
        query += "select dateof, total from (";
    }

    if (req.query.metric === "count") {
        if (req.query.assets && req.query.assets.length > 0) {
            params = params.concat(req.query.assets);
            query += "select date_trunc('" + granularity + "', p.purchasedon) assetdate,";

            for (i = 0; i < req.query.assets.length; ++i) {
                query += "sum(CASE WHEN asset = $" + (i+2) + " THEN 1 ELSE 0 END) AS asset" + req.query.assets[i];
                if (i < req.query.assets.length - 1) {
                    query += ", ";
                }
            }

            query += " from purchases p left join assets a on (p.asset = a.id and a.partner = $1) where asset in (";
            for (i = 0; i < req.query.assets.length; ++i) {
                query += (i > 0 ? ", ":"") + "$" + (i+2);
            }
            query += ") group by assetdate order by assetdate";
        } else {
            query += "select date_trunc('" + granularity + "', p.purchasedon) assetdate, \
                    count(*) AS total \
                    from purchases p left join assets a on (p.asset = a.id and a.partner = $1) \
                    group by assetdate order by assetdate";
        }

    } else if (req.query.metric === "downloads") {
        if (req.query.assets && req.query.assets.length > 0) {
            params = params.concat(req.query.assets);
            query += "select date_trunc('" + granularity + "', d.downloadedon) assetdate,";

            for (i = 0; i < req.query.assets.length; ++i) {
                query += "sum(CASE WHEN asset = $" + (i+2) + " THEN 1 ELSE 0 END) AS asset" + req.query.assets[i];
                if (i < req.query.assets.length - 1) {
                    query += ", ";
                }
            }

            query += " from downloads d left join assets a on (d.asset = a.id and a.partner = $1) where asset in (";
            for ( i = 0; i < req.query.assets.length; ++i) {
                query += (i > 0 ? ", ":"") + "$" + (i+2);
            }
            query += ") group by assetdate order by assetdate";

        } else {
            query += "select date_trunc('" + granularity + "', d.downloadedon) assetdate, \
                    count(*) AS total \
                    from downloads d left join assets a on (d.asset = a.id and a.partner = $1) \
                    group by assetdate order by assetdate";
        }
    } else {
        if (req.query.assets && req.query.assets.length > 0) {
            params = params.concat(req.query.assets);
            query += "select date_trunc('" + granularity + "', p.purchasedon) assetdate,";

            for (i = 0; i < req.query.assets.length; ++i) {
                query += "SUM(CASE WHEN asset = $" + (i+2) + " THEN p.toparticipant ELSE 0 END) AS asset" + req.query.assets[i];
                if (i < req.query.assets.length - 1) {
                    query += ", ";
                }
            }

            query += " from purchases p left join assets a on (p.asset = a.id and a.partner = $1) where asset in (";
            for (i = 0; i < req.query.assets.length; ++i) {
                query += (i > 0 ? ", ":"") + "$" + (i+2);
            }
            query += ") group by assetdate order by assetdate";
        } else {
            query += "select date_trunc('" + granularity + "', p.purchasedon) assetdate, \
                    SUM(p.toparticipant) AS total \
                    from purchases p left join assets a on (p.asset = a.id and a.partner = $1) \
                    group by assetdate order by assetdate";
        }
    }

    query += ") q \
            right join (SELECT \
            (date_trunc('" + granularity + "',CURRENT_DATE) + (\"Series\".\"Index\" || '" + granularity + "')::INTERVAL) AS \"dateof\" \
            FROM \
            generate_series(-12,1, 1) AS \"Series\"(\"Index\")) d on(d.dateof = assetdate)";

    var json = utils.standardJson(req);
    json.stats = [];

    //console.log("trying " + query + " with " + params);
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
