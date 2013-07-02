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
                            ],
                            people: [
                                {
                                    "name": "Aaron Seigo",
                                    "email": "aseigo@kde.org",
                                    "roles": [
                                        "Content Creator",
                                        "Partner Manager"
                                    ]
                                },
                                {
                                    "name": "Zack Rusin",
                                    "email": "zack@kde.org",
                                    "roles": [
                                        "Content Creator",
                                        "Store Manager",
                                        "Validator"
                                    ]
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
                        'application/json');
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
                        'application/json');
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
                        'application/json');
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
                        'application/json');
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
                        'application/json');
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
                        'application/json');
                    res.headers.should.have.property('set-cookie');
                    cookie = res.headers['set-cookie'];
                    res.body.should.have.property('authStatus', true);
                    done();
                });
        });
    });

    function checkPartnerList(expected, done) {
        utils.getUrl(
                server,
                '/bodega/v1/json/partner/list',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('partners');
                    res.body.partners.should.eql(expected);
                    done();
                },
                cookie);
    }

    describe('listing pre-creation', function() {
        it('should list just KDE', function(done) {
            checkPartnerList(existingPartnerJson, done);
        });
    });

    describe('creating and updating a new partner', function() {
        var newPartnerId = 0;
        var newPartnerJson =
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
                    ],
                    people: [
                        {
                            "name": "Zack Rusin",
                            "email": "zack@kde.org",
                            "roles": [
                                "Accounts",
                                "Partner Manager"
                            ]
                        }
                    ]
                };
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
                        'application/json');
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
                        'application/json');
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
                        'application/json');
                    res.body.should.have.property('partnerId');
                    newPartnerId = res.body.partnerId;
                    newPartnerJson.id = newPartnerId;
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
                        'application/json');
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
                        'application/json');
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
            };
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
                        'application/json');
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
                        'application/json');
                    res.body.should.have.property('success', true);
                    done();
                },
                cookie);
        });

        it('listing should show new partner', function(done) {
            var expected = existingPartnerJson.slice();
            expected.push(newPartnerJson);
            checkPartnerList(expected, done);
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
                        'application/json');
                    res.body.should.have.property('success', false);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type', 'InvalidRole');
                    server.config.printErrors = true;
                    done();
                },
                cookie);

        });

        describe('role management', function(done) {
            it('should allow listing known roles', function(done) {
                utils.getUrl(
                    server,
                    '/bodega/v1/json/partner/roles/list',
                function(res) {
                    var expected = ['Accounts', 'Content Creator', 'Partner Manager', 'Store Manager', 'Validator'];
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('success', true);
                    res.body.should.have.property('roles');
                    res.body.roles.should.eql(expected);
                    done();
                },
                cookie);
            });

            it('should be able to set roles for a partner we are a manager for', function(done) {
                params = {
                            person: 'aseigo@kde.org',
                            roles: [ 'Validator', 'Accounts' ],
                         };
                utils.postUrl(
                    server,
                    '/bodega/v1/json/partner/roles/update/' + newPartnerId,
                    params,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('success', true);
                    var expected = existingPartnerJson.slice();
                    expected.push(newPartnerJson);
                    expected[1].people = [
                        {
                            "name": "Aaron Seigo",
                            "email": "aseigo@kde.org",
                            "roles": [
                                "Accounts",
                                "Validator"
                            ]
                        },
                        {
                            "name": "Zack Rusin",
                            "email": "zack@kde.org",
                            "roles": [
                                "Accounts",
                                "Partner Manager"
                            ]
                        }
                    ]

                    checkPartnerList(expected, done);
                },
                cookie);

               });

            it('should be able to delete a role for a partner we are a manager for', function(done) {
                params = {
                            person: 'aseigo@kde.org',
                            roles: [ 'Accounts' ],
                         };
                utils.postUrl(
                    server,
                    '/bodega/v1/json/partner/roles/update/' + newPartnerId,
                    params,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('success', true);
                    var expected = existingPartnerJson.slice();
                    expected.push(newPartnerJson);
                    expected[1].people = [
                        {
                            "name": "Aaron Seigo",
                            "email": "aseigo@kde.org",
                            "roles": [
                                "Accounts"
                            ]
                        },
                        {
                            "name": "Zack Rusin",
                            "email": "zack@kde.org",
                            "roles": [
                                "Accounts",
                                "Partner Manager"
                            ]
                        }
                    ]

                    checkPartnerList(expected, done);
                },
                cookie);

               });

            it('should be able to delete all roles for a person with a partner we are a manager for', function(done) {
                params = {
                    person: 'aseigo@kde.org'
                };

                utils.postUrl(
                    server,
                    '/bodega/v1/json/partner/roles/update/' + newPartnerId,
                    params,
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property(
                            'content-type',
                            'application/json');
                        res.body.should.have.property('success', true);
                        var expected = existingPartnerJson.slice();
                        expected.push(newPartnerJson);
                        expected[1].people = [
                            {
                                "name": "Zack Rusin",
                                "email": "zack@kde.org",
                                "roles": [
                                    "Accounts",
                                    "Partner Manager"
                                ]
                            }
                        ];

                        checkPartnerList(expected, done);
                },
                cookie);

               });

            it('request publisher status', function(done) {
                params = {
                    reason: 'So we can upload content.'
                };

                utils.postUrl(
                    server,
                    '/bodega/v1/json/partner/request/publisher/' + newPartnerId,
                    params,
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property(
                            'content-type',
                            'application/json');
                        res.body.should.have.property('success', true);
                        done();
                    },
                    cookie);
            });

            it('request distributor status', function(done) {
                params = {
                    reason: 'So we can make stores.'
                };

                utils.postUrl(
                    server,
                    '/bodega/v1/json/partner/request/publisher/' + newPartnerId,
                    params,
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property(
                            'content-type',
                            'application/json');
                        res.body.should.have.property('success', true);
                        done();
                    },
                    cookie);
            });
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
