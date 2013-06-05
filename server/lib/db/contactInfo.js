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
    var json = {}
    var warehouse = {
        name: app.config.storeInfo.name,
        description: app.config.storeInfo.description,
        url: app.config.storeInfo.url,
        contact: app.config.storeInfo.contact
    };

    if (req.session !== undefined && req.session.authorized) {
        json = utils.standardJson(req);
        json.warehouse = warehouse;

        db.query(
            "select s.name, s.description, p.name as owner, p.homepage as url, p.supportEmail as contact from stores s left join partners p on (s.partner = p.id) where s.id = $1", [req.session.user.store],
            function(err, result) {
                if (err) {
                    errors.report('Database', req, res, err);
                    return;
                }

                if (!result || result.rowCount < 1) {
                    res.json(json);
                    return;
                }

                json.store = result.rows[0];
                res.json(json);
            });
    } else {
        res.json(warehouse);
    }
};
