/*
    Copyright 2013 Coherent Theory LLC

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
               transport.sendMail(mailOptions, cb);
           } else {
               console.log(output);
               if (cb) {
                   cb();
               }
           }
       });
};
