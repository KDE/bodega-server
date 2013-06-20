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

var utils = require('../utils.js');
var errors = require('../errors.js');

function linkFetcher(task, cb)
{
    task.db.query("select p.service, p.account, p.url, CASE WHEN s.icon IS NULL THEN '' ELSE s.icon END, s.baseurl from partnerContacts p left join partnerContactServices s on (p.service = s.service) where partner = $1",
             [task.partner],
             function (err, result) {
                 if (err) {
                     errors.report('Database', req, res, err);
                     cb(err);
                     return;
                 }

                 var links = [];
                 var i;
                 for (i = 0; i < result.rowCount; ++i) {
                     var contact = result.rows[i];
                     var url;
                     if (contact.url && contact.url !== '') {
                         url = contact.url;
                     } else {
                         url = contact.baseurl + contact.account;
                     }

                     links.push({ type: contact.service, url: url, icon: contact.icon});
                 }

                 for (i = 0; i < task.json.partners.length; ++i) {
                     if (task.json.partners[i].id == task.partner) {
                        task.json.partners[i].links = links;
                     }
                 }
                 cb();
             });
}

module.exports.list = function(db, req, res)
{
    db.query("select distinct p.id, p.name, p.supportEmail as email, p.publisher, p.distributor, p.owedPoints as points from partners p join affiliations a on (p.id = a.partner and a.person = $1)",
            [req.session.user.id],
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

                var queue = async.queue(linkFetcher, 2);
                queue.drain = function() {
                    res.json(json);
                }

                for (var i = 0; i < result.rowCount; ++i) {
                    var store = result.rows[i];
                    store.links = [];
                    json.partners.push(store);

                    var task = {
                        'db': db,
                        'req': req,
                        'res': res,
                        'json': json,
                        'partner': store.id
                    };

                    queue.push(task);
                }
            });
};

module.exports.create = function(db, req, res)
{

};

module.exports.update = function(db, req, res)
{

};

module.exports.requestDestributorStatus = function(db, req, res)
{

};

module.exports.requestPublisherStatus = function(db, req, res)
{

};


