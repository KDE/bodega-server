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
var BCrypt = require('bcrypt');
var nodemailer = require('nodemailer');


function deleteUser(db, userId)
{
    var query = 'DELETE FROM people WHERE id=$1;';
    db.query(
        query, [userId],
        function(err, result) {
            if (err) {
                return;
            }
        });
}

function sendConfirmationEmail(db, req, res, args)
{
    var service = app.config.service;
    //XXX: replace with jade and html emails
    var template =
'Welcome to Make·Play·Live, \n\
 \n\
 To start using your Make·Play·Live account please confirm your email address\n\
 by clicking on the following link:\n \
 \n\
 http://#{host}#{prefix}register/confirm?code=#{code}&email=#{email}&id=#{userId}\n \
 \n\
 Thank You,\n \
 Make·Play·Live Team\n';
    var transport = nodemailer.createTransport("SMTP",{
        host:             service.smtp.host,
        secureConnection: service.smtp.useSSL,
        port:             service.smtp.port,
        auth: {
            user: service.smtp.user,
            pass: service.smtp.pass
        }
    });

    var mailOptions = {
        transport: transport, // transport method to use
        from: service.email,
        to: args.email, // list of receivers
        subject: "Activate your new account", // Subject line
        //text: text, //set later
        //html: "<b>Hello world!</b>" // html body
    };

    var query =
        'select ct_createAccountActivationCode($1) as activationcode;';

    db.query(
        query, [args.userId],
        function(err, result) {
            var text;
            var json = {
                userId: args.userId
            };
            if (err) {
                deleteUser(db, args.userId);
                errors.report('Database', req, res, err);
                return;
            }

            var confirmationCode = result.rows[0].activationcode;
            text = template.replace('#{code}', confirmationCode);
            text = text.replace('#{email}', args.email);
            text = text.replace('#{userId}', args.userId);
            text = text.replace('#{host}', req.headers.host);
            text = text.replace('#{prefix}', app.config.prefix);
            mailOptions.text = text;

            if (app.settings.env === 'test') {
                json.confirmationCode = confirmationCode;
                json.text = text;
                res.json(json);
                console.log(text);
            } else {
                nodemailer.sendMail(mailOptions, function(error) {
                    var json = {};
                    if (error) {
                        deleteUser(db, args.userId);
                        errors.report('MailerFailure', req, res, error);
                        transport.close();
                        return;
                    }

                    json.message =
                        "Confirmation email sent!";
                    //console.log("Message sent!");
                    res.json(json);
                    transport.close(); // lets shut down the connection pool
                });
            }
        }
    );
}

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
                    sendConfirmationEmail(db, req, res, args);
                }
            );
        });
    });
}

function findUser(db, req, res, args)
{
    var findQuery =
        'SELECT id, active FROM people WHERE email=$1;';

    db.query(
        findQuery,
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
                sendConfirmationEmail(db, req, res, args);
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

    if (args.password.length < 8) {
        //"Password has to have at least 8 characters.",
        errors.report('PasswordTooShort', req, res);
        return;
    }

    findUser(db, req, res, args);
};
