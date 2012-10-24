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

module.exports = function(db, req, res) {
    /*jshint multistr:true */
    var historyQuery =
        "SELECT 'Download' AS category, title AS what, downloadedon AS date, 'Version: ' || version AS comment FROM downloads WHERE person = $1 \
        UNION \
        SELECT 'Purchase' AS category, name AS what, purchasedon AS date, '' AS comment FROM purchases WHERE person = $1 \
        UNION \
        SELECT 'Points' AS category, points::text AS what, created AS date, comment FROM pointTransactions WHERE person = $1 \
        ORDER BY date DESC LIMIT $2 OFFSET $3;";
    var defaultPageSize = 50;
    var pageSize = (req.query.pageSize || defaultPageSize) + 1;
    var offset = req.query.offset || 0;

    db.query(
        historyQuery, [req.session.user.id, pageSize, offset],
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }

            var json = {
                device : req.session.user.device,
                authStatus : req.session.authorized,
                points : req.session.user.points,
                offset : offset,
                hasMoreHistory: false,
                history : []
            };

            if (result) {
                json.hasMoreHistory = result.rows.length > pageSize;
                if (result.rows.length > pageSize) {
                    json.hasMoreHistory = true;
                    result.rows.pop();
                }

                json.history = result.rows;
            }

            res.json(json);
        });
};
