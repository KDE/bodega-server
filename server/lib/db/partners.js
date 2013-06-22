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

function linkFetcher(task, cb)
{
    task.db.query("select case WHEN p.service IS NULL THEN '' ELSE p.service END,\
                          case WHEN p.account IS NULL THEN '' ELSE p.account END,\
                          CASE WHEN p.url IS NULL THEN '' ELSE p.url END, \
                          CASE WHEN s.icon IS NULL THEN '' ELSE s.icon END \
                  from partnerContacts p left join partnerContactServices s on (p.service = s.service)\
                  where partner = $1 order by p.service",
             [task.partner],
             function (err, result) {
                 if (err) {
                     cb(errors.create('Database', err.message));
                     return;
                 }

                 for (i = 0; i < task.json.partners.length; ++i) {
                     if (task.json.partners[i].id === task.partner) {
                        task.json.partners[i].links = result.rows;
                     }
                 }
                 cb();
             });
}

function insertPartner(db, req, res, name, email, cb)
{
    db.query("insert into partners (name, supportEmail) values ($1, $2) returning id as id",
             [name, email],
             function(err, result) {
                 if (err) {
                     if (errors.dbErrorType(err, 'UniqueKey')) {
                         cb(errors.create('PartnerNameExists',
                                          'Partner ' + name + ' already exists in the database'));
                     } else {
                         cb(errors.create('Database', err.message));
                     }

                     return;
                 }

                 cb(null, db, req, res, result.rows[0].id);
            });
}

function addDefaultAffiliation(db, req, res, partnerId, cb)
{
    db.query("insert into affiliations (person, partner, role) select $1, $2, id from personRoles where description = 'Partner Manager';",
             [req.session.user.id, partnerId],
             function(err, result) {
                  if (err) {
                      cb(errors.create('Database', err.message));
                      return;
                  }

                  var json = utils.standardJson(req);
                  json.partnerId = partnerId;
                  cb(null, json);
             });
}

function updatePartner(db, req, res, partner, data, cb)
{
    data.params.push(partner);
    db.query("update partners set " + data.columns.join(', ') + " where id = $3",
             data.params,
             function(err, result) {
                 if (err) {
                     if (errors.dbErrorType(err, 'UniqueKey')) {
                         cb(errors.create('PartnerNameExists',
                                          'Partner ' + data.params[0] + ' already exists in the database'));
                     } else {
                         cb(errors.create('Database', err.message));
                     }

                     return;
                 }

                 cb(null, utils.standardJson(req));
            });
}

function confirmServiceExists(db, req, res, partner, data, cb)
{
    var service = req.body.service;
    if (service !== '') {
        db.query("select * from partnercontactservices where service = $1",
                 [service],
                 function(err, result) {
                     if (err) {
                         cb(errors.create('Database', err.message));
                         return;
                     }

                     if (result.rowCount < 1) {
                         cb(errors.create('InvalidLinkService', 'Service ' + service + ' is uknown'));
                         return;
                     }

                     cb(null, db, req, res, partner);
                 });
    } else {
        cb(null, db, req, res, partner);
    }
}

function requireAccountOrUrl(db, req, res, partner, cb)
{
    if (!req.body.account && !req.body.url) {
        cb(errors.create('MissingParameters', 'An account or a URL is required'));
        return;
    }

    if (req.body.url) {
        try {
            check(req.body.url).isUrl();
        } catch(e) {
            cb(errors.create('InvalidUrl'));
            return;
        }
    }

    cb(null, db, req, res, partner);
}

function createPartnerLink(db, req, res, partner, cb)
{
    db.query("insert into partnerContacts (partner, service, account, url) values ($1, $2, $3, $4)",
             [partner, req.body.service, req.body.account, req.body.url],
             function(err, result) {
                 if (err) {
                     cb(errors.create('Database', err.message));
                     return;
                 }

                 cb(null, utils.standardJson(req));
             });
}

function deletePartnerLink(db, req, res, partner, cb)
{
    var params = [partner];
    var whereClause = ['partner = $1'];

    if (req.body.service) {
        params.push(req.body.service);
        whereClause.push('service = $' + params.length);
    }

    if (req.body.aclength) {
        params.push(req.body.aclength);
        whereClause.push('aclength = $' + params.length);
    }

    if (req.body.url) {
        params.push(req.body.url);
        whereClause.push('url = $' + params.length);
    }

    db.query("delete from partnerContacts where " + whereClause.join(' and '),
             params,
             function(err, result) {
                 if (err) {
                     cb(errors.create('Database', err.message));
                     return;
                 }

                 if (result.rowCount < 1) {
                     cb(errors.create('NoMatch', 'Could not find the requested partner link: ' + params.join(', ')));
                     return;
                }
                 cb(null, utils.standardJson(req));
             });
}

module.exports.list = function(db, req, res)
{
    db.query("select distinct p.id, p.name, p.supportEmail as email, p.publisher, p.distributor, p.owedPoints as points from partners p join affiliations a on (p.id = a.partner and a.person = $1) order by id",
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
                var error = null;
                queue.drain = function() {
                    if (error) {
                        errors.report(error.type, req, res, error);
                    } else {
                        res.json(json);
                    }
                };

                function errorReporter(err) {
                    error = err;
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

                    queue.push(task, errorReporter);
                }
            });
};

module.exports.create = function(db, req, res)
{
    var name = sanitize(req.body.name).trim();
    if (name === '') {
        errors.report('MissingParameters', req, res);
        return;
    }

    var email = sanitize(req.body.email).trim();
    if (email !== '') {
        try {
            check(email).isEmail();
        } catch (e) {
            errors.report('InvalidEmailAddress', req, res, e);
            return;
        }
    }

    utils.wrapInTransaction([insertPartner, addDefaultAffiliation], db, req, res, name, email);
};

module.exports.update = function(db, req, res)
{
    var partner = utils.parseNumber(req.params.partner);
    if (partner < 1) {
        errors.report('MissingParameters', req, res);
        return;
    }

    var data = {
        columns: [],
        params: []
    };

    var name = sanitize(req.body.name).trim();
    if (name !== '') {
        data.params.push(name);
        data.columns.push('name = $' + data.params.length);
    }

    var email = sanitize(req.body.email).trim();
    if (email !== '') {
        try {
            check(email).isEmail();
            data.params.push(email);
            data.columns.push('supportEmail = $' + data.params.length);
        } catch (e) {
        }
    }

    utils.wrapInTransaction([utils.requireRole, updatePartner], db, req, res,
                            partner, 'Partner Manager', data);
};

module.exports.createLink = function(db, req, res)
{
    var partner = utils.parseNumber(req.params.partner);
    if (partner < 1) {
        errors.report('MissingParameters', req, res);
        return;
    }

    utils.wrapInTransaction([utils.requireRole, confirmServiceExists, requireAccountOrUrl, createPartnerLink],
                            db, req, res, partner, 'Partner Manager', null);
};

module.exports.deleteLink = function(db, req, res)
{
    var partner = utils.parseNumber(req.params.partner);
    if (partner < 1) {
        errors.report('MissingParameters', req, res);
        return;
    }

    utils.wrapInTransaction([utils.requireRole, confirmServiceExists, requireAccountOrUrl, deletePartnerLink],
                            db, req, res, partner, 'Partner Manager', null);
};

module.exports.requestDestributorStatus = function(db, req, res)
{
    var partner = utils.parseNumber(req.params.partner);
    if (partner < 1) {
        errors.report('MissingParameters', req, res);
        return;
    }

    utils.wrapInTransaction([utils.requireRole, deletePartnerLink], db, req, res,
                            partner, 'Partner Manager');
};

module.exports.requestPublisherStatus = function(db, req, res)
{

};


