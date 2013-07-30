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

module.exports = function(db, req, res)
{
    if (!Array.isArray(req.body.assets) || req.body.assets.length < 1) {
        var json = utils.standardJson(req);
        json.assets = [];
        res.json(json);
        return;
    }

    if (req.body.assets.length > 500) {
        errors.report('TooManyParameters', req, res);
        return;
    }

    var sql = 'select distinct a.id from assets a where ';
    var rows = [];
    var params = [];
    var count = 0;
    req.body.assets.forEach(function(asset) {
        if (!Array.isArray(asset) || asset.length !== 2) {
            return;
        }

        var id = utils.parseNumber(asset[0]);
        if (id < 1) {
            return;
        }

        var ts = Date.parse(asset[1]);
        if (ts) {
            rows.push('(a.id = $' + (++count) + ' and a.versionts > $' + (++count) + ')');
            params.push(id);
            var date = new Date();
            date.setTime(ts);
            params.push(date);
        }
    });

    if (rows.length < 1) {
        var json = utils.standardJson(req);
        json.assets = [];
        res.json(json);
        return;
    }

    sql += rows.join(' OR ');

    //console.log(sql);
    //console.log(params);
    db.query(sql, params,
    function(err, result) {
        if (err) {
            errors.report('Database', req, res, err);
            return;
        }

        var json = utils.standardJson(req);
        json.assets = [];
        for (var i = 0; i < result.rowCount; ++i) {
            json.assets.push(result.rows[i].id);
        }

        res.json(json);
    });
};


