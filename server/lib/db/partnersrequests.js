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

var async = require('async');
var check = require('validator').check;
var sanitize = require('validator').sanitize;

var utils = require('../utils.js');
var errors = require('../errors.js');



module.exports.listPartnerRequests = function(db, req, res)
{
    db.query("select * from partnerrequests order by id",
            [],
            function (err, result) {
                if (err) {
                    errors.report('Database', req, res, err);
                    return;
                }

                var json = utils.standardJson(req);
                json.partners = [];

                if (result.rowCount < 1) {
                    res.json(json);
                    return;
                }

                json.partners = result.rows;
                res.json(json);
            });
};

module.exports.approvePublisherStatus = function(db, req, res)
{
    
}

module.exports.approveDistributorStatus = function(db, req, res)
{
    
}

