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
                            "assets": 25,
                            "downloads": 22,
                            "purchases": 13,
                            "stores": 2,
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
            utils.postUrl('partner/create', {},
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
            utils.postUrl('partner/update/1002', {},
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
            utils.getUrl('partner/list',
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
            utils.postUrl('partner/request/publisher/1002', {},
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
            utils.postUrl('partner/request/distributor/1002', {},
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

    utils.auth({ store: 'null' });

    function checkPartnerList(expected, done) {
        utils.getUrl('partner/list',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('partners');
                    res.body.partners.should.eql(expected);
                    done();
                },
                utils.cookie);
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
                    "assets": 0,
                    "downloads": 0,
                    "purchases": 0,
                    "stores": 0,
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
            utils.postUrl('partner/create',
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
                utils.cookie);
        });

        it('creation should fail with an invalid email', function(done) {
            var params = { name: 'Somewhere', email: 'foo..somewhere.org' };
            server.config.printErrors = false;
            utils.postUrl('partner/create',
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
                utils.cookie);
        });

        it('creation should succeed with good data', function(done) {
            var params = { name: 'Somewhere', email: 'foo@somewhere.org' };
            utils.postUrl('partner/create',
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
                utils.cookie);
        });

        it('update should succeed with good data', function(done) {
            var params = { name: 'Sometime', email: 'foo@sometime.org' };
            utils.postUrl('partner/update/' + newPartnerId,
                params,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('success', true);
                    done();
                },
                utils.cookie);
        });

        it('adding invalid contact links should fail', function(done) {
            var params = { service: 'Not Even Close', email: 'foo..somewhere.org' };
            server.config.printErrors = false;
            var queue = async.queue(function(task, cb) {
            utils.postUrl('partner/' + task.partner + '/link/create',
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
                utils.cookie);
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
            utils.postUrl('partner/' + newPartnerId + '/link/create',
                params,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('success', true);
                    cb();
                },
                utils.cookie);
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
            utils.postUrl('partner/' + newPartnerId + '/link/delete',
                params,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json');
                    res.body.should.have.property('success', true);
                    done();
                },
                utils.cookie);
        });

        it('listing should show new partner', function(done) {
            var expected = existingPartnerJson.slice();
            expected.push(newPartnerJson);
            checkPartnerList(expected, done);
        });

        it('should not allow updating a partner we are not a manager for', function(done) {
            var params = { name: 'Sometime', email: 'foo@sometime.org' };
            server.config.printErrors = false;
            utils.postUrl('partner/update/' + 1003,
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
                utils.cookie);

        });

        describe('bank account information', function(done) {
            var account =
            {
                type: 'destination',
                nameOnAccount: 'Big Time Inc.',
                address: '1200 Nowhere Ave',
                bank: 'Fable Bank',
                bankAddress: '1000 Banking Way',
                account: '1111-111-1111-111',
                swift: '',
                iban: '10101011010101'
            };

            it('should allow setting the transfer account info', function(done) {
                utils.postUrl('partner/' + newPartnerId + '/banking/account/update',
                    account,
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property('content-type', 'application/json');
                        res.body.should.have.property('success', true);
                        done();
                    },
                    utils.cookie);
            });

            it('should fail setting the transfer account if missing iban or swift', function(done) {
                var badAccount = JSON.parse(JSON.stringify(account));
                badAccount.swift = '';
                badAccount.iban = '';
                utils.postUrl('partner/' + newPartnerId + '/banking/account/update',
                    badAccount,
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property('content-type', 'application/json');
                        res.body.should.have.property('error');
                        res.body.error.should.have.property('type', 'MissingParameters');
                        done();
                    },
                    utils.cookie);
            });

            it('should fail setting the transfer account if missing the name', function(done) {
                var badAccount = JSON.parse(JSON.stringify(account));
                badAccount.nameOnAccount = '';
                utils.postUrl('partner/' + newPartnerId + '/banking/account/update',
                    badAccount,
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property('content-type', 'application/json');
                        res.body.should.have.property('error');
                        res.body.error.should.have.property('type', 'MissingParameters');
                        done();
                    },
                    utils.cookie);
            });

            it('should fail setting the transfer account if missing the address', function(done) {
                var badAccount = JSON.parse(JSON.stringify(account));
                badAccount.address = '';
                utils.postUrl('partner/' + newPartnerId + '/banking/account/update',
                    badAccount,
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property('content-type', 'application/json');
                        res.body.should.have.property('error');
                        res.body.error.should.have.property('type', 'MissingParameters');
                        done();
                    },
                    utils.cookie);
            });

            it('should fail setting the transfer account if missing the bank name', function(done) {
                var badAccount = JSON.parse(JSON.stringify(account));
                badAccount.bank = '';
                utils.postUrl('partner/' + newPartnerId + '/banking/account/update',
                    badAccount,
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property('content-type', 'application/json');
                        res.body.should.have.property('error');
                        res.body.error.should.have.property('type', 'MissingParameters');
                        done();
                    },
                    utils.cookie);
            });

            it('should fail setting the transfer account if missing the bank address', function(done) {
                var badAccount = JSON.parse(JSON.stringify(account));
                badAccount.bankAddress = '';
                utils.postUrl('partner/' + newPartnerId + '/banking/account/update',
                    badAccount,
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property('content-type', 'application/json');
                        res.body.should.have.property('error');
                        res.body.error.should.have.property('type', 'MissingParameters');
                        done();
                    },
                    utils.cookie);
            });

            it('should fail setting the transfer account if missing the account number', function(done) {
                var badAccount = JSON.parse(JSON.stringify(account));
                badAccount.account = '';
                utils.postUrl('partner/' + newPartnerId + '/banking/account/update',
                    badAccount,
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property('content-type', 'application/json');
                        res.body.should.have.property('error');
                        res.body.error.should.have.property('type', 'MissingParameters');
                        done();
                    },
                    utils.cookie);
            });

            it('should list the current account', function(done) {
                utils.getUrl('partner/' + newPartnerId + '/banking/account/list',
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property('content-type', 'application/json');
                        res.body.should.have.property('success', true);
                        res.body.accounts.should.eql([ account ]);
                        done();
                    },
                    utils.cookie);
            });

            it('deletion should succeed', function(done) {
                utils.getUrl('partner/' + newPartnerId + '/banking/account/delete',
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property('content-type', 'application/json');
                        res.body.should.have.property('success', true);
                        done();
                    },
                    utils.cookie);
            });

            it('should list no account', function(done) {
                utils.getUrl('partner/' + newPartnerId + '/banking/account/list',
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property('content-type', 'application/json');
                        res.body.should.have.property('success', true);
                        res.body.accounts.should.eql([]);
                        done();
                    },
                    utils.cookie);
            });
        });

        describe('role management', function(done) {
            it('should allow listing known roles', function(done) {
                utils.getUrl('partner/roles/list',
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
                utils.cookie);
            });

            it('should be able to set roles for a partner we are a manager for', function(done) {
                var params = {
                            person: 'aseigo@kde.org',
                            roles: [ 'Validator', 'Accounts' ],
                         };
                utils.postUrl('partner/roles/update/' + newPartnerId,
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
                    ];

                    checkPartnerList(expected, done);
                },
                utils.cookie);

               });

            it('should be able to delete a role for a partner we are a manager for', function(done) {
               var params = {
                            person: 'aseigo@kde.org',
                            roles: [ 'Accounts' ],
                         };
                utils.postUrl('partner/roles/update/' + newPartnerId,
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
                    ];

                    checkPartnerList(expected, done);
                },
                utils.cookie);

               });

            it('should be able to delete all roles for a person with a partner we are a manager for', function(done) {
                var params = {
                    person: 'aseigo@kde.org'
                };

                utils.postUrl('partner/roles/update/' + newPartnerId,
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
                utils.cookie);

               });

            it('request publisher status', function(done) {
               var params = {
                    reason: 'So we can upload content.'
                };

                utils.postUrl('partner/request/publisher/' + newPartnerId,
                    params,
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property(
                            'content-type',
                            'application/json');
                        res.body.should.have.property('success', true);
                        done();
                    },
                    utils.cookie);
            });

            it('request distributor status', function(done) {
               var params = {
                    reason: 'So we can make stores.'
                };

                utils.postUrl('partner/request/publisher/' + newPartnerId,
                    params,
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property(
                            'content-type',
                            'application/json');
                        res.body.should.have.property('success', true);
                        done();
                    },
                    utils.cookie);
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
