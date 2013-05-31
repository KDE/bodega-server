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

var errors = require('../errors.js');
var utils = require('../utils.js');

function defaultPartnerId(db, req, res, fn)
{
    db.query("select partner from affiliations a left join personRoles r on (a.role = r.id) where a.person = $1 and r.description = 'Store Manager';",
            [req.session.user.id],
            function(err, result) {
                if (err || !result.rows || result.rows.length === 0) {
                    errors.report('StorePartnerInvalid', req, res);
                    return -1;
                }

                fn(result.rows[0].partner, db, req, res);
            });
}

function partnerId(db, req, res, fn)
{
    var partner = utils.parseNumber(req.query.partner);
    if (partner < 1) {
        defaultPartnerId(db, req, res, fn);
    } else {
        db.query("select partner from affiliations a left join personRoles r on (a.role = r.id) where a.partner = $1 and a.person = $2 and r.description = 'Store Manager';",
                [partner, req.session.user.id],
                function(err, result) {
                    if (err || !result.rows || result.rows.length === 0) {
                        errors.report('StorePartnerInvalid', req, res);
                        return;
                    }

                    fn(partner, db, req, res);
                });
    }
}

function sendStoreJson(id, db, req, res)
{
    var query = "select s.id, s.name, s.description, s.partner as partnerId, p.name as partnerName, s.minMarkup, s.maxMarkup, s.flatMarkup, s.markup \
                 from stores s join partners p on (s.partner = p.id) \
                 where p.id in (select distinct partner from affiliations where person = $1)";
    var params = [req.session.user.id];
    if (typeof id === 'string' && id.length > 0) {
        query += " and s.id = $2";
        params.push(id);
    }
    query += " order by s.id";

    db.query(query, params, function(err, result) {
                 if (err || !result.rows || result.rows.length < 1) {
                     errors.report('Database', req, res, err);
                     return;
                 }

                 var storeInfo = [];

                 for (var i = 0; i < result.rows.length; ++i) {
                     var r = result.rows[i];
                     storeInfo.push(
                         { 'id': r.id,
                           'name': r.name,
                           'desc': r.description,
                           'partner': { 'id': r.partnerid, 'name': r.partnername },
                           'markups': { 'min': r.minmarkup, 'max': r.maxmarkup,
                           'flat': r.flatmarkup, 'markup': r.markup }
                     });
                 }

                 var json = utils.standardJson(req);
                 json.storeInfo = storeInfo;
                 res.json(json);
             });
}

function createWithPartner(partner, db, req, res)
{
    var name = req.query.name;
    if (!name || name === '') {
        errors.report('StoreNameInvalid', req, res);
        return;
    }

    var id = req.query.id;
    if (!id || id === '') {
        id = partner + '_' + name.toUpperCase().replace(/[^a-zA-Z0-9]/g, '_');
    }

    // confirm that this store ID does not exist first
    db.query("select id from stores where id = $1;", [id],
             function(err, result) {
                 if (err) {
                    errors.report('Database', req, res);
                    return;
                 }

                 if (result.rows && result.rows.length > 0) {
                    errors.report('StoreIdExists', req, res);//, errors.create("Store id exists", "Attempted to create " + id + " for " + partner));
                    return;
                 }

                 var minMarkup = utils.parseNumber(req.query.minMarkup);
                 var maxMarkup = utils.parseNumber(req.query.maxMarkup);
                 var flatMarkup = utils.parseBool(req.query.flatMarkup);
                 var markup = utils.parseNumber(req.query.markup);
                 db.query("insert into stores (id, partner, name, description, minMarkup, maxMarkup, flatMarkup, markup) values ($1, $2, $3, $4, $5, $6, $7, $8);",
                          [id, partner, name, req.query.desc, minMarkup, maxMarkup, flatMarkup, markup],
                          function(err, result) {
                            if (err) {
                                errors.report('Database', req, res, err);
                                return;
                            }

                            sendStoreJson(id, db, req, res);
                         });
            });
}

function deleteWithPartner(partner, db, req, res)
{
    var id = req.query.id;
    if (!id || id === '') {
        errors.report('StoreIdInvalid', req, res, errors.create("Invalid Store Id", "Invalid store passed into store deletion: " + id));
        return;
    }

    db.query("delete from stores where id = $1 and partner = $2", [id, partner],
             function(err, result) {
                if (err) {
                    errors.report('Database', req, res);
                    return;
                }

                if (result.rowCount < 1) {
                    errors.report('StoreNotDeleted', req, res);
                    return;
                }

                res.json(utils.standardJson(req));
             });
}

function ifCanManageStore(db, req, res, fn)
{
    partnerId(db, req, res,
              function(partner, db, req, res) {
                  db.query("select id from stores where id = $1 and partner = $2", [req.query.id, partner],
                        function(err, result) {
                            if (err || !result) {
                                errors.report('Database', req, res);
                                return;
                            }

                            if (!result.rows || result.rows.count < 1) {
                                errors.report('StoreIdInvalid', req, res);
                                return;
                            }

                            fn(partner, result.rows[0].id, db, req, res);
                        });
              });
}

function setMarkups(partner, store, db, req, res)
{
    var query = "update stores set ";
    var updates = [];
    var params = [];
    var count = 0;

    var min = utils.parseNumber(req.query.minmarkup, -1);
    if (min >= 0) {
        updates.push("minMarkup = $" + ++count);
        params.push(min);
    }

    var max = utils.parseNumber(req.query.maxmarkup, -1);
    if (max >= 0) {
        updates.push("maxMarkup = $" + ++count);
        params.push(max);
    }

    var flat = req.query.flatmarkup;
    if (flat) {
        flat = utils.parseBool(flat);
        updates.push("flatMarkup = $" + ++count);
        params.push(flat);
    }

    var markup = utils.parseNumber(req.query.markup, -1);
    if (markup >= 0) {
        updates.push("markup = $" + ++count);
        params.push(markup);
    }

    if (count > 0) {
        query += updates.join(', ') + ' where id = $' + ++count;
        params.push(store);
        db.query(query, params,
                 function(err, result) {
                     if (err) {
                         errors.report('Database', req, res);
                         return;
                     }

                     sendStoreJson(store, db, req, res);
                 });
    } else {
        sendStoreJson(store, db, req, res);
    }
}

/********************* PUBLIC API *********************/

/**
 * No arguments taken, returns an array containing all stores associated to this
 * person's partner organizations
 */
module.exports.list = function(db, req, res) {
    sendStoreJson(null, db, req, res);
}

/**
 * + int partner
 * + string name
 * * string ID
 * * string description
 * * int minmarkup
 * * int maxmarkup
 * * int flatmarkup
 * * int markup
 **/
module.exports.create = function(db, req, res) {
    partnerId(db, req, res, createWithPartner);
};

/**
 * + string ID
 */
module.exports.delete = function(db, req, res) {
    partnerId(db, req, res, deleteWithPartner);
};

/**
 * + string ID
 * + int minMarkup
 * + int maxMarkup
 * + bool flatMarkup
 * + markup
 */
module.exports.setMarkups = function(db, req, res) {
    ifCanManageStore(db, req, res, setMarkups);
}
