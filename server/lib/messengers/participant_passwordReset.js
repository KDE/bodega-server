
var mailer = require('nodemailer');
var path = require('path');
var template = require('email-template');
var Url = require('url');

module.exports.sendEmail = function(transport, db, record, cb)
{
    db.query('select ct_createPasswordResetCode($1) as resetcode;',
             [ record.recipient ],
             function(err, result) {
                if (err || result.rowCount < 1) {
                    return;
                }

                var mailOptions = {
                    transport: transport,
                    from: app.config.service.email,
                    to: record.email,
                    subject: "Activate your new " + app.config.warehouseInfo.name + " account"
                };

                record.warehouse = app.config.warehouseInfo.name;
                var url = Url.parse(app.config.externalBaseUrl + app.config.prefix + "participant/resetPassword");
                url.query = { 'code': result.rows[0].resetcode,
                              'email': record.email,
                              'id': record.recipient };
                record.url = Url.format(url);
                console.log("Url is ... " + record.url);
                template.createBodies(
                    {
                        text: path.join(__dirname, '/participant_passwordReset.handlebars.text')
                    },
                    record,
                    function(err, output) {
                        if (app.production) {
                            mailOptions.text = output.text;
                            mailer.sendEmail(mailOptions, cb);
                        } else {
                            console.log(output);
                            if (cb) {
                                cb();
                            }
                        }
                    });
             });
};
