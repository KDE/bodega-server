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
    db.query('select ct_createAccountActivationCode($1) as activationcode;',
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
                var url = Url.parse(app.config.externalBaseUrl + app.config.prefix + "register/confirm");
                url.query = { 'code': result.rows[0].activationcode,
                              'email': record.email,
                              'id': record.recipient };
                record.url = Url.format(url);

                template.createBodies(
                    {
                        text: path.join(__dirname, '/participant_accountActivation.handlebars.text')
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
             });
};
