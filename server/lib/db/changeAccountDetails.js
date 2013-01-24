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
var payments = require('../payments.js');
var check = require('validator').check;
var sanitize = require('validator').sanitize;

function series(callbacks, errHandler, db, req, res) {
    function next(err) {
        var callback = callbacks.shift();

        if (err) {
            errHandler(db, req, res, err);
            return;
        }

        if (callback) {
            callback(db, req, res, function(err) {
                next(err);
            });
        }
    }
    next();
}


function performUpdate(db, field, value, user, next)
{
    var resetQuery = 'UPDATE people SET ' + field + ' = $1 WHERE id = $2;';
    db.query(resetQuery, [value, user], function(err, result) {
        if (err) {
            err.name = 'Database';
            next(err);
            return;
        }
        next();
    });
}

function performFirstNameUpdate(db, req, res, next)
{
    if (!req.query.firstName) {
        next();
        return;
    }
    var firstName = sanitize(req.query.firstName).trim();
    if (firstName !== '') {
        performUpdate(db, 'firstName', firstName, req.session.user.id, next);
    } else {
        next();
    }
}

function performLastNameUpdate(db, req, res, next)
{
    if (!req.query.lastName) {
        next();
        return;
    }
    var lastName = sanitize(req.query.lastName).trim();
    if (lastName !== '') {
        performUpdate(db, 'lastName', lastName, req.session.user.id, next);
    } else {
        next();
    }
}

function performEmailUpdate(db, req, res, next)
{
    if (!req.query.email) {
        next();
        return;
    }
    var email = sanitize(req.query.email).trim();
    if (email !== '') {
        try {
            check(email).isEmail();
        } catch (e) {
            next(errors.create('AccountUpdateFailed', e.message));
            return;
        }
        var findQuery =
            'SELECT id, active FROM people WHERE email = $1 AND id !=  $2;';
        db.query(
            findQuery,
            [email, req.session.user.id],
            function(err, result) {
                if (err) {
                    next(errors.create('Database', err.message));
                    return;
                }

                if (result.rows && result.rows.length > 0 &&
                    result.rows[0].active) {
                    next(errors.create('AccountExists'));
                    return;
                } else {
                    performUpdate(db, 'email',
                                  email, req.session.user.id, next);
                }
            }
        );
    }
}



function performCardUpdate(db, req, res, next)
{
    var card = req.query.card;
    if (card) {
        var query =
            "SELECT u.id, u.email, u.active FROM people u WHERE u.id = $1;";
        var args = {
            "userId" : req.session.user.id,
            "card" : card
        };
        db.query(query, [args.userId], function(err, result) {
            if (err) {
                err.name = 'Database';
                next(err);
                return;
            }
            if (!result.rows || result.rows.length !== 1) {
                next(errors.create('NoMatch'));
                return;
            }
            args.email = result.rows[0].email;
            //console.log(args.email);
            payments.updateCardDetails(db, args, function(err, customerId) {
                if (err) {
                    next(err);
                    return;
                }
                //console.log(customerId);
                next();
            });
        });
    } else {
        next();
    }
}

function completeUpdate(db, req, res, next)
{
    // by the time we reach here, we are good and done!
    var json = utils.standardJson(req, true);
    res.json(json);
    next();
}

function errorHandler(db, req, res, err)
{
    errors.report(err.name, req, res, err);
}

module.exports.paymentMethod = function(db, req, res) {
    var args = { userId: req.session.user.id};
    payments.retrievePaymentMethod(db, args, function(err, card) {
        var json;
        if (err) {
            errors.report(err.name, req, res, err);
        } else {
            json = utils.standardJson(req, true);
            json.card = card;
            res.json(json);
        }
    });
};

module.exports.deletePaymentMethod = function(db, req, res) {
    var args = { userId: req.session.user.id};
    payments.deletePaymentMethod(db, args, function(err) {
        if (err) {
            errors.report(err.name, req, res, err);
        } else {
            var json = utils.standardJson(req, true);
            res.json(json);
        }
    });
};

module.exports.changeDetails = function(db, req, res) {
    if (!req.session.authorized) {
        //console.log("not authorized");
        return;
    }

    //Execute updates serially
    series([
        performEmailUpdate,
        performFirstNameUpdate,
        performLastNameUpdate,
        performCardUpdate,
        completeUpdate
        ], errorHandler, db, req, res);
};
