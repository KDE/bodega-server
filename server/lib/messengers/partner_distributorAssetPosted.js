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

var utils = require('../utils.js');

module.exports.sendEmail = function(transport, db, record, cb)
{
    var mailOptions = {
        transport: transport,
        from: app.config.service.email,
        to: app.config.addresses.assetRequests,
        subject: "Asset posted for publication"
    };

    db.query("select name from partners where id = $1",
             [ record.data.partner ],
             function(err, result) {
                if (err || result.rowCount < 1) {
                    return;
                }

                record.partnerName = result.rows[0].name;

                template.createBodies(
                    {
                        text: path.join(__dirname, '/partner_distributorAssetPosted.handlebars.text')
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
