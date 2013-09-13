
var mailer = require('nodemailer');
var path = require('path');
var template = require('email-template');
var Url = require('url');

module.exports.sendEmail = function(transport, db, record, cb)
{
   var mailOptions = {
       transport: transport,
       from: app.config.service.email,
       to: record.data.email,
       bcc: app.config.service.email,
       subject: app.config.warehouseInfo.name + " rejection notice"
   };

   record.warehouse = app.config.warehouseInfo.name;
   record.serviceemail = app.config.service.email;

   template.createBodies(
       {
           text: path.join(__dirname, '/partner_distributor_assetRejection.handlebars.text')
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
};
