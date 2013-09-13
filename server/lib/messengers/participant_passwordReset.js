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
