
var mailer = require('nodemailer');
var path = require('path');
var template = require('email-template');
var wrap = require('wordwrap')(40, 80);

var utils = require('../utils.js');

module.exports.sendEmail = function(transport, db, record, cb)
{
    var mailOptions = {
        transport: transport,
        from: app.config.service.email,
        to: app.config.addresses.partnerRequests,
        subject: "Publisher account upgrade request"
    };

    // break the message up into nice short lines for the email
    record.data.message = wrap(record.data.message);

    db.query("select name from partners where id = $1",
             [ record.data.partner ],
             function(err, result) {
                if (!err && result.rowCount > 0) {
                    record.partnerName = result.rows[0].name;
                } else {
                    record.partnerName = '';
                }

                template.createBodies(
                    {
                        text: path.join(__dirname, '/partner_publisherRequest.handlebars.text')
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
