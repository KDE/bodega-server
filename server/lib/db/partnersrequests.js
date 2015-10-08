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
var validator = require('validator');

var utils = require('../utils.js');
var errors = require('../errors.js');

function loadRequest (db, req, res, requestInfo, cb) {
    var requestQuery =
            "SELECT partnerrequests.id, partner, name,\
              supportemail, type, person, reason\
              from partnerrequests\
              join partners on partners.id = partner\
              where partnerrequests.id = $1";
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

            if (result.rowCount < 1) {
                cb(errors.create('InvalidRequestId'), db, req, res);
                return;
            }

            requestInfo = result.rows[0];

            cb(null, db, req, res, requestInfo);
        });
}

function approveRequest(db, req, res, requestInfo, cb) {

    var updateQuery;
    var distributor = requestInfo.type === 'distributorRequest';
    if (distributor) {
        updateQuery = 'UPDATE partners SET distributor = true WHERE id = $1';
    } else {
        //default is publisher
        updateQuery = 'UPDATE partners SET publisher = true WHERE id = $1';
    }
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

            if (distributor) {
                utils.createTagIfMissing(requestInfo.partner, 'signoff',
                                         'Signed off by ' + requestInfo.name,
                                         db, req, res,
                                         function(err, result, db, req, res) {
                                            if (err && err.type === 'TagExists') {
                                                err = null;
                                            }

                                            cb(err, db, req, res, requestInfo);
                                        });
            } else {
                cb(null, db, req, res, requestInfo);
            }
        });
}


function deleteFromPartnerRequests (db, req, res, requestInfo, cb) {

    var deleteQuery =
            'DELETE FROM partnerrequests WHERE partner = $1 AND type = $2';
    var e;

    var q = db.query(
        deleteQuery, [requestInfo.partner, requestInfo.type],
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

function queueAcceptenceMessage(db, req, res, requestInfo, cb)
{
    db.query("INSERT INTO emailQueue (recipient, data, template) \
              VALUES ($1, hstore(Array[['partner', $2]]), $3)",
             [requestInfo.person, requestInfo.name, ('partner_' + requestInfo.type + 'Accept')],
             function(err, result) {
                 if (err) {
                     errors.report('Database', req, res, err);
                 }

                 cb(err, db, req, res, requestInfo);
             });
}

function queueRejectionMessage(db, req, res, requestInfo, cb)
{
    db.query("INSERT INTO emailQueue (recipient, data, template) \
              VALUES ($1, hstore(Array[['partner', $2], ['reason', $3]]), $4)",
             [requestInfo.person, requestInfo.name, req.body.reason, ('partner_' + requestInfo.type + 'Reject')],
             function(err, result) {
                 if (err) {
                     errors.report('Database', req, res, err);
                 }

                 cb(err, db, req, res, requestInfo);
             });
}

module.exports.listPartnerRequests = function(db, req, res)
{
    db.query("SELECT r.id, r.partner, pa.name, \
              pa.supportemail, r.type, r.person, pe.fullname, r.reason \
              FROM partnerrequests r \
              JOIN partners pa ON r.partner = pa.id \
              JOIN people pe ON r.person = pe.id \
              ORDER BY r.id",
            [],
            function (err, result) {
                if (err) {
                    errors.report('Database', req, res, err);
                    return;
                }

                var json = utils.standardJson(req);

                if (result.rowCount < 1) {
                    json.requests = [];
                    res.json(json);
                    return;
                }

                json.requests = result.rows;
                res.json(json);
            });
};

module.exports.managePartnerRequest = function(db, req, res)
{
    var requestInfo = {};

    var funcs = [loadRequest];

    //begin transaction
    // fetch info on the particular request
    if (utils.parseBool(req.body.approved)) {
        // approve a request
        funcs.push(approveRequest);
        funcs.push(queueAcceptenceMessage);
    } else {
        // Tell the user why is refused
        funcs.push(queueRejectionMessage);
    }
    //  delete from requests
    funcs.push(deleteFromPartnerRequests);
    funcs.push(function(db, req, res, requestInfo, cb) {
            cb(null, utils.standardJson(req));
        });

    utils.wrapInTransactionAndReply(funcs, db, req, res, requestInfo);
};
