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

/**
 * creates all the date related parts of the query:
 *  - limit: the where query clause limiting the dates included
 *  - granularity: month/day/year
 *  - generator: a query that generates a complete time series over the given period at the desired granularity
 */
function dateQueryParts(req)
{
    var from;
    var to;

    if (req.query.to) {
        to = new Date(req.query.to);
    } else {
        to = new Date();
    }

    if (req.query.from) {
        from = new Date(req.query.from);
    } else {
        from = new Date(to);
        //defaults to a month before to
        from.setDate(-1);
        from.setDate(to.getDay());
    }
    
    var dates = {};

    dates.granularity = "month";

    //only other two allowed values are year and day
    if (req.query.granularity === "day") {
        dates.granularity = "day";
    } else if (req.query.granularity === "year") {
        dates.granularity = "year";
    }

    var column = req.params.metric === "downloads" ? "m.downloadedOn" : "m.purchasedOn";
    dates.limit =
           " and date_trunc('" + dates.granularity + "', " + column + ") >= to_date('" +
           from.toUTCString() + "', 'DY, DD Mon YYYY HH24:MI:SS') and date_trunc('" +
           dates.granularity + "', " + column + ") <= to_date('" + to.toUTCString() +
           "', 'DY, DD Mon YYYY HH24:MI:SS') ";           
    
    var iterations = 0;
    if (dates.granularity === "day") {
        var oneDay = 24*60*60*1000; // hours*minutes*seconds*milliseconds
        iterations = Math.round(Math.abs((to.getTime() - from.getTime())/(oneDay)));
    } else if (dates.granularity === "year") {
        iterations = to.getFullYear() - from.getFullYear();
    } else {
        //Month
        iterations = to.getMonth() * (to.getFullYear() - from.getFullYear() + 1) - from.getMonth();
    }

    dates.generator = "SELECT (date_trunc('" + dates.granularity + "',to_date('" + from.toUTCString() + "', 'DY, DD Mon YYYY HH24:MI:SS')) + (\"Series\".\"Index\" || '" + 
                      dates.granularity + "')::INTERVAL) AS \"dateof\" FROM generate_series(0," + iterations + ", 1) AS \"Series\"(\"Index\")";
    return dates;
}

/**
 * Creates the main crostab query
 */
function summationQuery(req, dateParts, partner)
{
    var i;
    var query = '';
    var assetDateColumn = 'purchasedOn';
    var joinTable = 'purchases';
    var crossTabSum = '1';
    var totalSum = "count(*)";
    if (req.params.metric === "downloads") {
        assetDateColumn = 'downloadedOn';
        joinTable = 'downloads';
    } else if (req.params.metric === "points") {
        crossTabSum = 'toParticipant';
        totalSum = "sum(toParticipant)";
    }

    var params = [ partner ];

    if (req.query.assets && req.query.assets.length > 0) {
        query += "select dateof";

        for (i = 0; i < req.query.assets.length; ++i) {
            var id = utils.parseNumber(req.query.assets[i]);
            if (id > 0) {
                var name = '"' + id + '"';
                query += ", CASE WHEN " + name + " IS NULL THEN 0 ELSE " + name + " END AS " + name;
                params.push(id);
            }
        }

        query += " from (select date_trunc('" + dateParts.granularity + "', m." + assetDateColumn + ") assetdate,";

        for (i = 0; i < req.query.assets.length; ++i) {
            var id = utils.parseNumber(req.query.assets[i]);
            if (id > 0) {
                var name = '"' + id + '"';
                query += "sum(CASE WHEN asset = $" + (i + 2) + " THEN " + crossTabSum + " ELSE 0 END) AS " + name;
                if (i < req.query.assets.length - 1) {
                    query += ", ";
                }
            }
        }

        query += " from " + joinTable + " m left join assets a on (m.asset = a.id and a.partner = $1) where asset in (";
        for ( i = 0; i < req.query.assets.length; ++i) {
            query += (i > 0 ? ", ":"") + "$" + (i+2);
        }
        query += ") " + dateParts.limit + " group by assetdate order by assetdate)";
    } else {
        query += "select dateof, CASE WHEN total IS NULL THEN 0 ELSE total END AS total from (select date_trunc('" + dateParts.granularity + "', m." + assetDateColumn + 
                 ") AS assetdate, " + totalSum + " AS total from  " +  joinTable +
                 " m left join assets a on (m.asset = a.id and a.partner = $1) " +
                 dateParts.limit + " group by assetdate order by assetdate)";
    }

    var sql = { "query": query, "params": params }
    return sql;
}

function assetStats(partner, db, req, res)
{
    //default granularity is month
    var dateParts = dateQueryParts(req);
    var sql = summationQuery(req, dateParts, partner);
    sql.query += " q right join (" + dateParts.generator + ") d on(d.dateof = assetdate)";
    var json = utils.standardJson(req);
    json.stats = [];

    //console.log("trying " + sql.query + " with " + sql.params);
    var q = db.query(
        sql.query,
        sql.params,
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }
            json.stats = result.rows;
            res.json(json);
        });
}

function storeStats(partner, db, req, res)
{
    //default granularity is month
    var dateParts = dateQueryParts(req);
    var sql = summationQuery(req, dateParts, partner);
    sql.query += " q right join (" + dateParts.generator + ") d on(d.dateof = assetdate)";
    var json = utils.standardJson(req);
    json.stats = [];

    //console.log("trying " + sql.query + " with " + sql.params);
    var q = db.query(
        sql.query,
        sql.params,
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }
            json.stats = result.rows;
            res.json(json);
        });
}

module.exports.assetStats = function(db, req, res) {
    utils.partnerId(db, req, res, assetStats);
};


module.exports.assetStores = function(db, req, res) {
    utils.partnerId(db, req, res, storeStats);
};

