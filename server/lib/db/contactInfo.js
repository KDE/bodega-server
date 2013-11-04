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

var async = require('async');

function addAssetSummary(store, db, req, json, jsonObjectName, cb)
{
    // and finally we get the asset summary
    db.query("SELECT t.title as type, sas.total \
              FROM storeAssetSummary sas JOIN tags t ON (sas.assetType = t.id) \
              WHERE sas.store = $1",
            [store],
            function(err, result) {
                if (err || result.rowCount > 0) {
                    json[jsonObjectName].assetSummary = result.rows;
                } else {
                    json[jsonObjectName].assetSummary = [];
                }

                cb(null, db, req, json);
            });
}

function addWarehouseInfo(db, req, json, cb)
{
    json.warehouse = {
        name: app.config.warehouseInfo.name,
        description: app.config.warehouseInfo.description,
        url: app.config.warehouseInfo.url,
        contact: app.config.warehouseInfo.contact
    };

    addAssetSummary("null", db, req, json, 'warehouse', cb);
}

function addStoreInfo(db, req, json, cb)
{
    // if we are authenticated against a store or given a store, fetch store info
    var store;
    if (req.query.store) {
        store = req.query.store;
    } else if (req.session !== undefined && req.session.authorized) {
        store = req.session.user.store;
    } else {
        cb(null, db, req, json);
        return;
    }

    db.query(
        "SELECT s.name, s.description, p.name AS owner, \
                p.supportEmail AS contact, s.partner AS partner \
                FROM stores s LEFT JOIN partners p ON (s.partner = p.id) \
                WHERE s.id = $1",
        [store],
        function(err, result) {
            if (err || !result || result.rowCount < 1) {
                cb(null, db, req, json);
                return;
            }

            json.store = {
                name: result.rows[0].name,
                description: result.rows[0].description,
                owner: result.rows[0].owner,
                contact: result.rows[0].contact,
                links: []
            };

            var partner = result.rows[0].partner;

            // now we look to see if there are any social media etc. links
            db.query("SELECT p.service, p.account, p.url, \
                      CASE WHEN s.icon IS NULL THEN '' ELSE s.icon END, s.baseurl \
                      FROM partnerContacts p LEFT JOIN partnerContactServices s ON (p.service = s.service) \
                      WHERE partner = $1",
                     [partner],
                     function (err, result) {
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

                         // and finally we get the asset summary
                         addAssetSummary(store, db, req, json, 'store', cb);
                     });
        });
}

module.exports = function(db, req, res) {
    var json = {};
    var funcs = [
            function(cb) { cb(null, db, req, json); },
            addWarehouseInfo,
            addStoreInfo
            ];

    async.waterfall(funcs,
                    function(err, db, req, json) { res.json(json); });
};
