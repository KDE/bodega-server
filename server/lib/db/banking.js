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

var async = require('async');
var check = require('validator').check;
var sanitize = require('validator').sanitize;

var utils = require('../utils.js');
var errors = require('../errors.js');

module.exports.setTransferAccount = function(db, req, res)
{
    var partner = utils.parseNumber(req.params.partner);
    if (partner < 1) {
        errors.report('MissingParameters', req, res);
        return;
    }

    utils.requireRole(db, req, res, partner, 'Account Manager', {},
                      function(err, db, req, res, partner, data) {
                          if (err) {
                              errors.report(err.name, req, res, err);
                              return;
                          }

                          if (!req.body.nameOnAccount ||
                              !req.body.address ||
                              !req.body.bank ||
                              !req.body.bankAddress ||
                              !req.body.account ||
                              (!req.body.swift && !req.body.iban)) {
                              errors.report('MissingParameters', req, res);
                              return;
                          }

                          db.query("delete from partnerBanking where partner = $1 and type = 'destination'",
                                   [ partner ],
                                   function(err) {
                                       if (err) {
                                           errors.report('Database', req, res, err);
                                           return;
                                       }

                                       db.query("insert into partnerBanking \
                                                 (partner, type, name, address, bank, bankAddress, \
                                                  account, swift, iban) \
                                                 VALUES ($1, 'destination', $2, $3, $4, $5, $6, $7, $8)",
                                                [ partner, req.body.nameOnAccount, req.body.address,
                                                  req.body.bank, req.body.bankAddress, req.body.account,
                                                  req.body.swift, req.body.iban ],
                                                 function(err) {
                                                     if (err) {
                                                         errors.report('Database', req, res, err);
                                                         return;
                                                     }

                                                     res.json(utils.standardJson(req));
                                                 });
                                   });
                      });
};

module.exports.deleteAccount = function(db, req, res)
{
    var partner = utils.parseNumber(req.params.partner);
    if (partner < 1) {
        errors.report('MissingParameters', req, res);
        return;
    }

    utils.requireRole(db, req, res, partner, 'Account Manager', {},
                      function(err, db, req, res, partner, data) {
                          if (err) {
                              errors.report(err.name, req, res, err);
                              return;
                          }

                          db.query("delete from partnerBanking where partner = $1 and type = 'destination'",
                                   [ partner ],
                                   function(err) {
                                       if (err) {
                                           errors.report('Database', req, res, err);
                                           return;
                                       }

                                       res.json(utils.standardJson(req));
                                   });
                      });
};

module.exports.listAccounts = function(db, req, res)
{
    var partner = utils.parseNumber(req.params.partner);
    if (partner < 1) {
        errors.report('MissingParameters', req, res);
        return;
    }

    utils.requireRole(db, req, res, partner, 'Account Manager', {},
                      function(err, db, req, res, partner, data) {
                          if (err) {
                              errors.report(err.name, req, res, err);
                              return;
                          }

                          db.query('select type, name as "nameOnAccount", address, bank, \
                                    bankAddress as "bankAddress", account, swift, iban \
                                    from partnerBanking where partner = $1',
                                   [ partner ],
                                   function(err, result) {
                                        if (err) {
                                            errors.report('Database', req, res, err);
                                            return;
                                        }

                                        var json = utils.standardJson(req);
                                        json.accounts = result.rows;
                                        res.json(json);
                                   });
                      });
};

