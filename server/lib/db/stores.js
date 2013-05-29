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
    db.query("select partner from affiliations a left join personRoles r on (a.role = r.id) where a.person = $1 and r.description = 'Content Creator';",
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
        db.query("select partner from affiliations a left join personRoles r on (a.role = r.id) where a.partner = $1 and a.person = $2 and r.description = 'Content Creator';",
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

function returnStoreJson(id, db, req, res)
{
    db.query("select s.name, s.description, s.partner as partnerId, p.name as partnerName, s.minMarkup, s.maxMarkup, s.flatMarkup, s.markup from stores s join partners p on (s.partner = p.id) where s.id = $1",
             [id], function(err, result) {
                 if (err || !result.rows || result.rows.length < 1) {
                     errors.report('Database', req, res, err);
                     return;
                 }

                 var r = result.rows[0];
                 var json = utils.standardJson(req, true);
                 json.storeInfo = { 'id': id,
                                    'name': r.name,
                                    'desc': r.description,
                                    'partner': { 'id': r.partnerid, 'name': r.partnername },
                                    'markups': { 'min': r.minmarkup, 'max': r.maxmarkup,
                                                 'flat': r.flatmarkup, 'markup': r.markup }
                                 };
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
                    errors.report('StoreIdExists', req, res, errors.create("Store id exists", "Attempted to create " + id + " for " + partner));
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

                            returnStoreJson(id, db, req, res);
                         });
            });
}

function deleteWithPartner(partner, db, req, res)
{
    var id = req.query.id;
    if (!id || id === '') {
        error('StoreIdInvalid', req, req, errors.create("Invalid Store Id", "Invalid store passed into store deletion: " + id));
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



/**
 * + int partner
 * + string name
 * * string ID
 * * string description
 * * int minmarkup
 * * int maxmarkup
 * * int flatmarkup
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

