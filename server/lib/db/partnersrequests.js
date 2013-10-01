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

function beginTransaction(db, req, res, requestInfo, cb)
{
    var query = "BEGIN;";
    var e;

    var q = db.query(query, [], function(err, result) {
        var i;
        if (err) {
            e = errors.create('Database', err.message);
            cb(e, db, req, res, requestInfo);
            return;
        }
        requestInfo.transaction = true;
        cb(null, db, req, res, requestInfo);
    });
}

function endTransaction(db, req, res, requestInfo, cb)
{
    var query = "COMMIT;";
    var e;

    var q = db.query(query, [], function(err, result) {
        var i;
        if (err) {
            e = errors.create('Database', err.message);
            cb(e, db, req, res, requestInfo);
            return;
        }
        cb(null, db, req, res, requestInfo);
    });
}

function loadRequest (db, req, res, requestInfo, cb) {
    var requestQuery =
            "SELECT * from partnerrequests where id = $1;";
    var e;

    var q = db.query(
        requestQuery, [req.params.requestId],
        function(err, result) {
            var i;
            if (err) {
                e = errors.create('Database', err.message);
                cb(e, db, req, res, requestInfo);
                return;
            }
            requestInfo = result.rows[0];

            cb(null, db, req, res, requestInfo);
        });
}

function approveDistributorRequest (db, req, res, requestInfo, cb) {
       
    var updateQuery =
            'update partners set distributor = true where id = $1';
    var e;

    var q = db.query(
        updateQuery, [requestInfo.partner],
        function(err, result) {
            var i;
            if (err) {
                e = errors.create('Database', err.message);
                cb(e, db, req, res, requestInfo);
                return;
            }

            cb(null, db, req, res, requestInfo);
        });
}

function deleteFromPartnerRequests (db, req, res, requestInfo, cb) {

    var deleteQuery =
            'delete from partnerrequests where id = $1';
    var e;

    var q = db.query(
        deleteQuery, [requestInfo.id],
        function(err, result) {
            var i;
            if (err) {
                e = errors.create('Database', err.message);
                cb(e, db, req, res, requestInfo);
                return;
            }

            cb(null, db, req, res, requestInfo);
        });
}

module.exports.listPartnerRequests = function(db, req, res)
{
    db.query("select partnerrequests.id, partner, name,\
              supportemail, type, reason\
              from partnerrequests\
              join partners on partners.id = partner order by id",
            [],
            function (err, result) {
                if (err) {
                    errors.report('Database', req, res, err);
                    return;
                }

                var json = utils.standardJson(req);
                json.partners = [];

                if (result.rowCount < 1) {
                    res.json(json);
                    return;
                }

                json.partners = result.rows;
                res.json(json);
            });
};

module.exports.managePartnerRequest = function(db, req, res)
{
    var requestInfo = {};

    var funcs = [function(cb) {
        cb(null, db, req, res, requestInfo);
    }];



    //begin transaction
    funcs.push(beginTransaction);
    // fetch info on the particular request
    funcs.push(loadRequest);
    //  approve a request
    funcs.push(approveDistributorRequest);
    //  delete from requests
    funcs.push(deleteFromPartnerRequests);
    //end transaction
    funcs.push(endTransaction);

    async.waterfall(funcs, function(err, results) {
        if (err) {
            if (results.transaction) {
                db.query("rollback", [], function() {
                    errors.report(err.name, req, res, err);
                });
            } else {
                errors.report(err.name, req, res, err);
            }
            return;
        }
        
        var json = utils.standardJson(req, true);

        res.send(json);
    });
}

