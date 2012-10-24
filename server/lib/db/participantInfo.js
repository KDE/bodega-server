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
    var json = {
        authStatus: req.session.authorized,
        assetCount: 0,
        channelCount: 0,
        storeCount: 0,
        pointsEarned: 0,
        pointsOwed: 0,
        points: 0,
        organization: '',
        firstName: '',
        lastName: '',
        email: ''
    };

    if (req.session.authorized) {
        var accountInfoQuery = "SELECT firstName, lastName, email FROM people WHERE id = $1;";
        var q = db.query(accountInfoQuery, [req.session.user.id],
                         function(err, result)
                         {
                             if (err) {
                                 errors.report('Database', req, res, err);
                                 return;
                             }

                            json.firstName = result.rows[0].firstname;
                            json.lastName = result.rows[0].lastname;
                            json.email = result.rows[0].email;

                            var assetCountQuery = "SELECT COUNT(id) AS assetCount FROM assets WHERE author = $1;";
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

