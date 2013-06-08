/*
    Copyright 2012 Coherent Theory LLC

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

var utils = require('../utils.js');
var errors = require('../errors.js');

module.exports = function(db, req, res) {
    var json = utils.standardJson(req);
    json.assetCount =  0;
    json.channelCount =  0;
    json.storeCount =  0;
    json.pointsEarned =  0;
    json.pointsOwed =  0;
    json.points =  0;
    json.organization =  '';
    json.firstName =  '';
    json.middleNames =  '';
    json.lastName =  '';
    json.email =  '';
    json.active =  '';

    if (req.session.authorized) {
        var accountInfoQuery = "SELECT firstName, middleNames, lastName, email, active FROM people WHERE id = $1;";
        var q = db.query(accountInfoQuery, [req.session.user.id],
                         function(err, result)
                         {
                             if (err) {
                                 errors.report('Database', req, res, err);
                                 return;
                             }

                            json.firstName = result.rows[0].firstname;
                            json.middleNames = result.rows[0].middlenames;
                            json.lastName = result.rows[0].lastname;
                            json.email = result.rows[0].email;
                            json.active = result.rows[0].active;

                            var assetCountQuery = "SELECT COUNT(id) AS assetCount FROM assets WHERE partner = $1;";
                            var q = db.query(assetCountQuery, [req.session.user.id],
                                             function(err, result)
                                             {
                                                if (err) {
                                                    errors.report('Database', req, res, err);
                                                    return;
                                                }

                                                json.assetCount = result.rows[0].assetCount;
                                                res.json(json);
                                             }
                                            );
                         }
                        );
    }
};

