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
    var json = {};
    var warehouse = {
        name: app.config.warehouseInfo.name,
        description: app.config.warehouseInfo.description,
        url: app.config.warehouseInfo.url,
        contact: app.config.warehouseInfo.contact
    };

    // if we are authenticated against a store, fetch store info
    if (req.session !== undefined && req.session.authorized) {
        json = utils.standardJson(req);
        json.warehouse = warehouse;

        db.query(
            "select s.name, s.description, p.name as owner, p.supportEmail as contact, s.partner as partner from stores s left join partners p on (s.partner = p.id) where s.id = $1", [req.session.user.store],
            function(err, result) {
                if (err) {
                    errors.report('Database', req, res, err);
                    return;
                }

                if (!result || result.rowCount < 1) {
                    res.json(json);
                    return;
                }

                json.store = {
                    name: result.rows[0].name,
                    description: result.rows[0].description,
                    owner: result.rows[0].owner,
                    contact: result.rows[0].contact
                };

                var partner = result.rows[0].partner;

                // now we look to see if there are any social media etc. links
                json.store.links = [];
                db.query("select p.service, p.account, p.url, CASE WHEN s.icon IS NULL THEN '' ELSE s.icon END, s.baseurl from partnerContacts p left join partnerContactServices s on (p.service = s.service) where partner = $1",
                         [partner],
                         function (err, result) {
                             if (err) {
                                 errors.report('Database', req, res, err);
                                 return;
                             }


                             for (var i = 0; i < result.rowCount; ++i) {
                                 var contact = result.rows[i];
                                 var url;
                                 if (contact.url && contact.url !== '') {
                                     url = contact.url;
                                 } else {
                                     url = contact.baseurl + contact.account;
                                 }

                                 json.store.links.push({ type: contact.service, url: url, icon: contact.icon});
                             }

                             res.json(json);

                         });
            });
    } else {
        res.json(warehouse);
    }
};
