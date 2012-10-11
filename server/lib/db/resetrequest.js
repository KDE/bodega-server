var utils = require('../utils.js');
var errors = require('../errors.js');
var nodemailer = require('nodemailer');


function sendResetEmail(db, req, res, args)
{
    var service = app.config.service;
    //XXX: replace with jade and html emails
    var template =
'Password reset for Make·Play·Live, \n\
 \n\
 In order to reset your password visit the following link:\n\
 \n\
 http://#{host}#{prefix}participant/resetPassword?code=#{code}&id=#{userId}&email=#{userEmail}\n \
 \n\
 The request came from #{address}.\n\
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
        subject: "Reset your password", // Subject line
        //text: text, //set later
        //html: "<b>Hello world!</b>" // html body
    };

    var query =
        'select ct_createPasswordResetCode($1) as resetcode;';

    db.query(
        query, [args.userId],
        function(err, result) {
            var text;
            var json = {
                userId: args.userId
            };
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }

            var resetCode = result.rows[0].resetcode;
            text = template.replace('#{code}', resetCode);
            text = text.replace('#{userId}', args.userId);
            text = text.replace('#{userEmail}', args.email);
            text = text.replace('#{host}', req.headers.host);
            text = text.replace('#{prefix}', app.config.prefix);
            var clientIp;
            if(req.headers['x-forwarded-for']){
                clientIp = req.headers['x-forwarded-for'];
            }
            else {
                clientIp = req.connection.remoteAddress;
            }
            text = text.replace('#{address}', clientIp);
            mailOptions.text = text;

            if (app.settings.env === 'test') {
                json.resetCode = resetCode;
                json.text = text;
                res.json(json);
                console.log(text);
            } else {
                nodemailer.sendMail(mailOptions, function(error) {
                    var json = {};
                    if (error) {
                        errors.report('MailerFailure', req, res, error);
                        transport.close();
                        return;
                    }

                    json.message = "Password reset email sent!";
                    //console.log("Message sent!");
                    res.json(json);
                    transport.close(); // lets shut down the connection pool
                });
            }
        }
    );
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
            if (!result.rows || result.rows.length === 0) {
                //"The given user account doesn't exist.",
                errors.report('NoMatch', req, res);
                return;
            }

            if (!result.rows[0].active) {
                //"Account has to be activated before it can be reset.",
                errors.report('AccountInactive', req, res);
                return;
            }
            args.userId = result.rows[0].id;
            sendResetEmail(db, req, res, args);
        }
    );
}



module.exports = function(db, req, res) {
    var args = {
        email  : req.query.email
    };

    if (!args.email) {
        //"Email address can not be empty.",
        errors.report('MissingParameters', req, res);
        return;
    }

    findUser(db, req, res, args);
};
