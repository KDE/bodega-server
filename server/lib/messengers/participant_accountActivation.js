
var mailer = require('nodemailer');
var path = require('path');
var template = require('email-template');
var Url = require('url');

module.exports.sendEmail = function(transport, db, record, cb)
{
    db.query('select ct_createAccountActivationCode($1) as activationcode;',
             [ record.recipient ]
             function(err, result) {
                if (err || result.rowCount < 1) {
                    return;
                }

                var mailOptions = {
                    transport: transport,
                    from: app.config.service.email,
                    to: result.rows[0].email,
                    subject: "Activate your new " + app.config.warehouse.name + " account"
                };

                record.warehouse = app.config.warehouse.name;
                var url = Url.parse(app.config.warehouseInfo.url + app.config.prefix + "register/confirm");
                url.query = { 'code': result.rows[0].activationcode,
                               'email': record.email,
                               'id': record.recipient };
                record.url = Url.format(url);

                template.createBodies(
                    {
                        text: path.join(__dirname, '/participant_accountActivation.handlebars.text');
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
