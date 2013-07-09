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

var async = require('async');
var nodemailer = require('nodemailer');
var errors = require('./errors.js');
var fs = require('fs');

module.exports.parseBool = function(string)
{
    return (string === 'true' || string === '1') ? true : false;
};

module.exports.parseNumber = function(string, defaultValue)
{
    if (string === null) {
        return 0;
    }

    var rv = parseInt(string, 10);
    if (isNaN(rv)) {
        return defaultValue ? defaultValue : 0;
    }

    return rv;
};

module.exports.findImagePaths = function(req)
{
    var serverUrl = "http://" + req.header('host');
    var previewPaths = app.previewStore.previewPaths();
    var imageUrls = {
        tiny: serverUrl + previewPaths.icons.tiny,
        small: serverUrl + previewPaths.icons.small,
        medium: serverUrl + previewPaths.icons.medium,
        large: serverUrl + previewPaths.icons.large,
        huge: serverUrl + previewPaths.icons.huge,
        previews: serverUrl + previewPaths.previews
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
        if (req.session && req.session.user) {
            json.store = req.session.user.store;
        } else {
            json.store = 0;
        }
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
    var transport = nodemailer.createTransport("SMTP", app.config.service.smtp);

    var mailOptions = {
        transport: transport, // transport method to use
        from: app.config.service.email,
        to: userEmail, // list of receivers
        subject: "Activate your new account"
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

            if (app.production) {
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
            } else {
                json.confirmationCode = confirmationCode;
                json.text = text;
                res.json(json);
                //console.log(text);
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

module.exports.requireRole = function(db, req, res, partner, role, data, cb)
{
    var roleQuery = 'select a.partner from affiliations a \
                     left join personRoles r on (a.role = r.id and r.description = $1) \
                     where a.partner = $2 and a.person = $3';

    db.query(roleQuery, [ role, partner, req.session.user.id ],
             function(err, result) {
                if (err) {
                    cb(errors.create('Database', err.message));
                    return;
                }

                if (result.rowCount < 1) {
                    cb(errors.create('InvalidRole', 'Request requires the ' + role + ' role'));
                    return;
                }

                cb(null, db, req, res, partner, data);
            });
};

module.exports.partnerId = function(db, req, res, cb, role)
{
    var partner = module.exports.parseNumber(req.body.partner ? req.body.partner : req.query.partner);
    var params = [req.session.user.id];

    var roleQuery = '';
    if (role !== undefined) {
        roleQuery = " and r.description = $2";
        params.push(role);
    }

    if (partner < 1) {
        // get the default (e.g. first) partner
        db.query("select partner from affiliations a left join personRoles r on (a.role = r.id) where a.person = $1" + roleQuery,
                params,
                function(err, result) {
                    if (err || !result.rows || result.rows.length === 0) {
                        errors.report('StorePartnerInvalid', req, res, err);
                        return -1;
                    }

                    cb(result.rows[0].partner, db, req, res);
                });
    } else {
        params.push(partner);
        var partnerIndex = params.length;
        db.query("select partner from affiliations a left join personRoles r on (a.role = r.id) where a.partner = $" + partnerIndex + " and a.person = $1 " + roleQuery,
                params,
                function(err, result) {
                    if (err || !result.rows || result.rows.length === 0) {
                        errors.report('StorePartnerInvalid', req, res, err);
                        return;
                    }

                    cb(partner, db, req, res);
                });
    }
};

module.exports.copyFile = function(source, target, cb) {
    var cbCalled = false;
    var rd, wr;

    function done(err) {
        if (!cbCalled) {
            cbCalled = true;
            cb(err);
        }
    }

    rd = fs.createReadStream(source);
    rd.on("error", function(err) {
        done(err);
    });
    wr = fs.createWriteStream(target);
    wr.on("error", function(err) {
        done(err);
    });
    wr.on("close", function(ex) {
        done();
    });
    rd.pipe(wr);
};

/**
 * Wraps any number of functions in a waterfalling transaction
 * Each function passed in will be executed one after the other within
 * a database transaction and are called with the db, req and res
 * params.
 *
 * The last may pass a json object to be sent back to the client
 *
 * functions: an array of functions
 * db: a database connection
 * req: the client request object
 * res: the client response object
 *
 * any number of parameters may be passed in after res and those will
 * be sent as additional parameters to this first function.
 *
 * if the last parameter passed in is a function, it is  used as a callback
 * that will be called with the usual (error, db, req, res) tuple
 * when the transaction is complete
 */
module.exports.wrapInTransaction = function(functions, db, req, res)
{
    if (functions.length  < 1) {
        console.log("Can not transact without functions!");
        return;
    }

    var startArgs = Array.prototype.slice.call(arguments, 1);
    startArgs.unshift(null);
    var cb;
    if (typeof startArgs[startArgs.length - 1] === 'function') {
        cb = startArgs.pop();
    }

    var funcs = [
        function(cb) {
            db.query("BEGIN", [], function(err, result) {
                if (err) {
                    cb(errors.create('Database', err.message));
                    return;
                }

                cb.apply(null, startArgs);
            });
        }
    ];

    funcs = funcs.concat(functions);

    async.waterfall(funcs, function(err, json) {
        if (err) {
            db.query("rollback", [],
                     function() {
                          if (cb) {
                              cb(err, db, req, res);
                          } else {
                              errors.report(err.name, req, res, err);
                          }
                     });
        } else {
            db.query("commit", [],
                     function(err, result) {
                          if (json) {
                              res.json(json);
                          }

                          if (cb) {
                              cb(null, db, req, res);
                          }
                     });
        }
    }
    );
};

