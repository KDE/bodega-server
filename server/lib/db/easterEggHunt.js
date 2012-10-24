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

module.exports = function(db, req, res) {
    var query = 'SELECT egg FROM easterEggs WHERE phrase = $1 AND device = $2';
    var errorObj;
    var json = {
        egg: ''
    };

    db.query(
        query,
        [req.query.code, req.query.device],
        function(err, result) {
            if (!err && result && result.rows.length > 0) {
                json.egg = result.rows[0].egg;
            }

            res.json(json);
        });
};
