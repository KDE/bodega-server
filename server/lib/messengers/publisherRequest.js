
var mailer = require('nodemailer');
var path = require('path');
var template = require('email-template');
var fs = require('fs');

module.exports.sendEmail = function(transport, data, cb)
{
    var mailOptions = {
        transport: transport,
        from: app.config.service.email,
        to: app.config.addresses.partnerRequests,
        subject: "Publisher account upgrade request"
    };

    template.createBodies(
            {
                text: path.join(__dirname, '/publisherRequest.handlebars.text')
            },
            data,
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
}
