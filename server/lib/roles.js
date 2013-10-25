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

var errors = require('./errors.js');

module.exports.isContentCreator = function(db, req, res, partnerId, fn)
{
    var e;
    db.query("SELECT PARTNER FROM affiliations a left join personRoles r ON (a.role = r.id) \
              WHERE a.partner = $1 AND a.person = $2 AND r.description = 'Content Creator';",
             [partnerId, req.session.user.id],
             function(err, result) {
                 if (err || !result.rows || result.rowCount < 1) {
                     e = errors.create('InvalidRole', err ? err.message : 'Your account is missing the Content Creator role for this partner');
                     fn(e, db, req, res);
                     return;
                 }

                 fn(null, db, req, res);
             });
};

module.exports.isValidator = function(db, req, res, partnerId, fn)
{
    var e;
    //console.log("checking up on partner");
    db.query("SELECT partner FROM affiliations a LEFT JOIN personRoles r ON (a.role = r.id) \
              WHERE (a.partner = 0 OR a.partner = $1) AND a.person = $2 AND r.description = 'Validator';",
            [partnerId, req.session.user.id],
            function(err, result) {
                if (err || !result.rows || result.rowCount < 1) {
                    e = errors.create('InvalidRole',
                        err ? err.message : 'Your account is missing the Validator role for this partner');
                    fn(e, db, req, res);
                    return;
                }

                fn(null, db, req, res);
            });
};

module.exports.isBodegaManager = function(db, req, res, fn)
{
    var e;
    var query = "SELECT partner FROM affiliations a \
        LEFT JOIN personRoles r ON (a.role = r.id) WHERE a.partner = 0 \
        AND a.person = $1 AND r.description = 'Validator';";
    var args = [req.session.user.id];
    db.query(query, args, function(err, result) {
        if (err || !result.rows || result.rows.length === 0) {
            e = errors.create('PartnerInvalid',
                              err ? err.message : '');
            fn(e, db, req, res);
            return;
        }

        fn(null, db, req, res);
    });
};

