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
var pg = require('pg');
var queryString = require('qs');

var server = require('../app.js');
var utils = require('./support/http');

describe('Partner management', function() {
    var cookie;
    var existingPartnerJson = [
                        {
                            id: 1002,
                            name: 'KDE',
                            email: 'info@kde.org',
                            publisher: false,
                            distributor: true,
                            points: 0,
                            links: [
                             {
                                 "service": "blog",
                                 "account": "",
                                 "url": "http://planet.kde.org",
                                 "icon": "extern/blog.png"
                             },
                             {
                                 "service": "website",
                                 "account": "",
                                 "url": "http://kde.org",
                                 "icon": ""
                             }
                          ]
                       }
                    ];

    describe('without authenticating', function(){
        it('Creating a partner should fail', function(done) {
            utils.postUrl(
                server,
                '/bodega/v1/json/partner/create', {},
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.headers.should.have.property('set-cookie');
                    res.body.should.have.property('authStatus', false);
                    res.body.should.have.property('error');
                    done();
                });
        });

        it('Updating a partner should fail', function(done) {
            utils.postUrl(
                server,
                '/bodega/v1/json/partner/update/1002', {},
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.headers.should.have.property('set-cookie');
                    res.body.should.have.property('authStatus', false);
                    res.body.should.have.property('error');
                    done();
                });
        });

        it('Listing partners should fail', function(done) {
            utils.getUrl(
                server,
                '/bodega/v1/json/partner/list',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.headers.should.have.property('set-cookie');
                    res.body.should.have.property('authStatus', false);
                    res.body.should.have.property('error');
                    done();
                });
        });

        it('Requesting publisher status should fail', function(done) {
            utils.postUrl(
                server,
                '/bodega/v1/json/partner/request/publisher/1002', {},
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.headers.should.have.property('set-cookie');
                    res.body.should.have.property('authStatus', false);
                    res.body.should.have.property('error');
                    done();
                });
        });

        it('Requesting distributor status should fail', function(done) {
            utils.postUrl(
                server,
                '/bodega/v1/json/partner/request/distributor/1002', {},
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.headers.should.have.property('set-cookie');
                    res.body.should.have.property('authStatus', false);
                    res.body.should.have.property('error');
                    done();
                });
        });
    });

    describe('authorization', function() {
        it('should succeed.', function(done) {
            utils.getUrl(
                server,
                '/bodega/v1/json/auth?auth_user=zack@kde.org&auth_password=zack&auth_store=null',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.headers.should.have.property('set-cookie');
                    cookie = res.headers['set-cookie'];
                    res.body.should.have.property('authStatus', true);
                    done();
                });
        });
    });

    describe('listing pre-creation', function() {
        it('should list just KDE', function(done) {
            utils.getUrl(
                server,
                '/bodega/v1/json/partner/list',
                function(res) {
                    var expected = existingPartnerJson;
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('partners');
                    res.body.partners.should.eql(expected);
                    done();
                },
                cookie);
        });
    });

    describe('creating and updating a new partner', function() {
        var newPartnerId = 0;
        it('creation should fail with an existing partner name', function(done) {
            server.config.printErrors = false;
            var params = { name: 'KDE', email: 'foo@somewhere.org' };
            utils.postUrl(
                server,
                '/bodega/v1/json/partner/create',
                params,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type', 'PartnerNameExists');
                    done();
                    server.config.printErrors = true;
                },
                cookie);
        });

        it('creation should fail with an invalid email', function(done) {
            var params = { name: 'Somewhere', email: 'foo..somewhere.org' };
            server.config.printErrors = false;
            utils.postUrl(
                server,
                '/bodega/v1/json/partner/create',
                params,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type', 'InvalidEmailAddress');
                    server.config.printErrors = true;
                    done();
                },
                cookie);
        });

        it('creation should succeed with good data', function(done) {
            var params = { name: 'Somewhere', email: 'foo@somewhere.org' };
            utils.postUrl(
                server,
                '/bodega/v1/json/partner/create',
                params,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('partnerId');
                    newPartnerId = res.body.partnerId;
                    done();
                },
                cookie);
        });

        it('update should succeed with good data', function(done) {
            var params = { name: 'Sometime', email: 'foo@sometime.org' };
            utils.postUrl(
                server,
                '/bodega/v1/json/partner/update/' + newPartnerId,
                params,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('success', true);
                    done();
                },
                cookie);
        });

        it('adding invalid contact links should fail', function(done) {
            var params = { service: 'Not Even Close', email: 'foo..somewhere.org' };
            server.config.printErrors = false;
            var queue = async.queue(function(task, cb) {
            utils.postUrl(
                server,
                '/bodega/v1/json/partner/' + task.partner + '/link/create',
                task.params,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type', task.error);
                    cb();
                },
                cookie);
            });

            var tasks = [
                {
                    params: { service: 'no such service', account: 'foo' },
                    partner: newPartnerId,
                    error: 'InvalidLinkService'
                },
                {
                    params: { service: 'blog' },
                    partner: newPartnerId,
                    error: 'MissingParameters'
                },
                {
                    params: { service: 'blog', url: 'malformedurl' },
                    partner: newPartnerId,
                    error: 'InvalidUrl'
                },
                {
                    params: { service: 'blog', url: 'http://nowhere' },
                    partner: 1003,
                    error: 'InvalidRole'
                }
            ];

            queue.push(tasks);
            queue.drain = function() {
                    server.config.printErrors = true;
                    done();
            }
        });

        it('adding contact links with proper data should succeed', function(done) {
            var queue = async.queue(function(params, cb) {
            utils.postUrl(
                server,
                '/bodega/v1/json/partner/' + newPartnerId + '/link/create',
                params,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('success', true);
                    cb();
                },
                cookie);
            });

            var tasks = [
                {
                    service: 'blog',
                    url: 'http://myblog.com'
                },
                {
                    service: 'identi.ca',
                    account: 'sometimes'
                },
                {
                    service: 'facebook',
                    account: 'meh'
                },
            ];
            queue.push(tasks);
            queue.drain = function() { done(); };
        });

        it('deleting a contact link should succeed', function(done) {
            var params = {
                service: 'facebook',
                account: 'meh'
            };
            utils.postUrl(
                server,
                '/bodega/v1/json/partner/' + newPartnerId + '/link/delete',
                params,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('success', true);
                    done();
                },
                cookie);
        });

        it('listing should show new partner', function(done) {
            var expected = existingPartnerJson;
            expected.push(
                {
                    "id": newPartnerId,
                    "name": "Sometime",
                    "email": "foo@sometime.org",
                    "publisher": false,
                    "distributor": false,
                    "points": 0,
                    "links": [
                        {
                            "service": "blog",
                            "account": "",
                            "url": "http://myblog.com",
                            "icon": "extern/blog.png"
                        },
                        {
                            "service": "identi.ca",
                            "account": "sometimes",
                            "url": "",
                            "icon": "extern/identica.png"
                        }
                    ]
                }
            );

            utils.getUrl(
                server,
                '/bodega/v1/json/partner/list',
                function(res) {
                    var expected = existingPartnerJson;
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('partners');
                    res.body.partners.should.eql(expected);
                    done();
                },
                cookie);
        });

        it('should not allow updating a partner we are not a manager for', function(done) {
            var params = { name: 'Sometime', email: 'foo@sometime.org' };
            server.config.printErrors = false;
            utils.postUrl(
                server,
                '/bodega/v1/json/partner/update/' + 1003,
                params,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('success', false);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type', 'InvalidRole');
                    server.config.printErrors = true;
                    done();
                },
                cookie);

        });

        after(function(done) {
            if (newPartnerId < 1) {
                return;
            }

            var connectionString = server.config.service.database.protocol + "://" +
                                   server.config.service.database.user + ":" + server.config.service.database.password +
                                   "@" + server.config.service.database.host + "/" +
                                   server.config.service.database.name;

            pg.connect(connectionString,
                       function(err, client, finis) {
                            client.query("delete from partners where id = $1", [newPartnerId],
                                    function() {
                                        finis();
                                        done();
                            });
            });
        });
    });
});
