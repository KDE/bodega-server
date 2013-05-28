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

var nodemailer = require('nodemailer');
var errors = require('./errors.js');

module.exports.parseBool = function(string)
{
    return (string === 'true' || string === '1') ? true : false;
};

module.exports.parseNumber = function(string)
{
    if (string === null) {
        return 0;
    }

    var rv = parseInt(string, 10);
    if (isNaN(rv)) {
        return 0;
    }

    return rv;
};

module.exports.findImagePaths = function(req)
{
    var serverUrl = "http://" + req.header('host') + '/';
    var imageUrls = {
        tiny: serverUrl + 'images/22',
        small: serverUrl + 'images/32',
        medium: serverUrl + 'images/64',
        large: serverUrl + 'images/128',
        huge: serverUrl + 'images/512',
        previews: serverUrl + 'images/previews'
    };
    return imageUrls;
};

module.exports.recordDownload = function(db, req)
{
    var ip = req.headers['x-forwarded-for'];
    if (!ip) {
        ip = req.connection.socket ? req.connection.socket.remoteAddress
                                   : req.connection.remoteAddress;
        if (!ip) {
            ip = "0.0.0.0";
        }
    }
    db.query("SELECT ct_recordDownload($1, $2, $3, $4);",
            [req.session.user.id, req.params.assetId, ip,
             req.session.user.store],
            function(err, result) { }
            );
};

module.exports.standardJson = function(req, success)
{
    var json = {};

    if (req && req.session && req.session.authorized && req.session.user) {
        json.authStatus = req.session.authorized;
        json.device = req.session.user.store; // V2 deprecated
        json.store = req.session.user.store;
        json.points = req.session.user.points;
    } else {
        json.authStatus = false;
        json.device = 0; // V2 deprecated
        json.store = req.session.user.store;
        json.points = 0;
    }

    json.success = typeof success !== 'undefined' ? success : true;
    return json;
};

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

module.exports.deleteUser = deleteUser;

module.exports.sendConfirmationEmail = function(db, req, res, userId, userEmail)
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
        to: userEmail, // list of receivers
        subject: "Activate your new account", // Subject line
        //text: text, //set later
        //html: "<b>Hello world!</b>" // html body
    };

    var query =
        'select ct_createAccountActivationCode($1) as activationcode;';

    db.query(
        query, [userId],
        function(err, result) {
            var text;
            var json = {
                userId: userId
            };
            if (err) {
                deleteUser(db, userId);
                errors.report('Database', req, res, err);
                return false;
            }

            var confirmationCode = result.rows[0].activationcode;
            text = template.replace('#{code}', confirmationCode);
            text = text.replace('#{email}', userEmail);
            text = text.replace('#{userId}', userId);
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
                        deleteUser(db, userId);
                        errors.report('MailerFailure', req, res, error);
                        transport.close();
                        return false;
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
    return true;
};

module.exports.authStore = function(req)
{
    if (req) {
        if (req.query.auth_store) {
            return req.query.auth_store;
        } else if (req.query.auth_device) {
            return req.query.auth_device;
        }
    }

    return null;
};

