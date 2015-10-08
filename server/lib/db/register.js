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

var BCrypt = require('bcrypt');
var validator = require('validator');

var utils = require('../utils.js');
var errors = require('../errors.js');

function createUser(db, req, res, args)
{
    var query =
        'INSERT INTO people (firstname, middlenames, lastname, email, \
         password) values ($1, $2, $3, $4, $5) RETURNING id;';
    BCrypt.genSalt(10, function(err, salt) {
        if (err) {
            //"Could not encrypt the password. Please try again.",
            errors.report('EncryptionFailure', req, res, err);
            return;
        }

        BCrypt.hash(args.password, salt, function(err, crypted) {
            if (err) {
                //"Couldn't encrypt the password. Please try again.",
                errors.report('EncryptionFailure', req, res, err);
                return;
            }
            //console.log('crypted: ' + crypted);
            db.query(
                query,
                [args.firstName, args.middleNames, args.lastName,
                 args.email, crypted],
                function(err, result) {
                    if (err) {
                        errors.report('Database', req, res, err);
                        return;
                    }
                    if (!result.rows || result.rows.length !== 1) {
                        //"Trouble registering new user. Please try again.",
                        errors.report('NoMatch', req, res);
                        return;
                    }
                    args.userId = result.rows[0].id;
                    utils.queueAccountActivationMessage(db, req, res, args.userId);
                }
            );
        });
    });
}

function findUser(db, req, res, args)
{

    db.query(
        'SELECT id, active FROM people WHERE email = $1;',
        [args.email],
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }
            if (result.rows && result.rows.length > 0) {
                if (result.rows[0].active) {
                    errors.report('AccountExists', req, res);
                    return;
                }
                args.userId = result.rows[0].id;
                utils.queueAccountActivationMessage(db, req, res, args.userId);
            } else {
                createUser(db, req, res, args);
            }
        }
    );
}

module.exports = function(db, req, res) {
    var args = {
        firstName : req.query.firstname,
        middleNames : req.query.middlenames,
        lastName : req.query.lastname,
        email  : req.query.email,
        password  : req.query.password
    };

    if (!args.email || !args.password) {
        errors.report('MissingParameters', req, res);
        return;
    }

    try {
        validator.isEmail(args.email);
    } catch (e) {
        errors.report('InvalidEmailAddress', req, res, e);
        return;
    }

    if (args.password.length < 8) {
        //"Password has to have at least 8 characters.",
        errors.report('PasswordTooShort', req, res);
        return;
    }

    findUser(db, req, res, args);
};

