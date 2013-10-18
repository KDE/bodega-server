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

var utils = require('./support/utils');

describe('Partner management', function() {
    var existingPartnerJson = [
        {
            id: 0,
            name: "Management Group",
            email: null,
            publisher: true,
            distributor: true,
            points: 0,
            links: [],
            assets: 0,
            downloads: 0,
            purchases: 0,
            storeassets: 0,
            stores: 1,
            people: [
                {
                    name: "Aaron Seigo",
                    email: "aseigo@kde.org",
                    roles: [
                        "Validator"
                    ]
                }
            ]
        },
        {
            id: 1002,
            name: 'KDE',
            email: 'info@kde.org',
            publisher: false,
            distributor: true,
            points: 0,
            links: [
                {
                    service: "blog",
                    account: "",
                    url: "http://planet.kde.org",
                    icon: "extern/blog.png"
                },
                {
                    service: "website",
                    account: "",
                    url: "http://kde.org",
                    icon: ""
                }
            ],
            assets: 25,
            downloads: 22,
            purchases: 13,
            storeassets: 24,
            stores: 2,
            people: [
                {
                    name: "Aaron Seigo",
                    email: "aseigo@kde.org",
                    roles: [
                        "Partner Manager"
                    ]
                },
                {
                    name: "Zack Rusin",
                    email: "zack@kde.org",
                    roles: [
                        "Content Creator",
                        "Store Manager",
                        "Validator"
                    ]
                }
            ]
        }
    ];

    var dbSnapshotBefore;
    before(function(done) {
        utils.dbSnapshot(null, function(err, res) {
            if (err) {
                console.log("Couldn't snapshot the db!");
            }
            dbSnapshotBefore = res;
            done();
        });
    });

    describe('without authenticating', function(){
        it('Creating a partner should fail', function(done) {
            utils.postUrl('partner/create', {},
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.headers.should.have.property('set-cookie');
                    res.body.should.have.property('authStatus', false);
                    res.body.should.have.property('error');
                    done();
                },
                { noAuth: true });
        });

        it('Updating a partner should fail', function(done) {
            utils.postUrl('partner/update/1002', {},
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.headers.should.have.property('set-cookie');
                    res.body.should.have.property('authStatus', false);
                    res.body.should.have.property('error');
                    done();
                },
                { noAuth: true });
        });

        it('Listing partners should fail', function(done) {
            utils.getUrl('partner/list',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.headers.should.have.property('set-cookie');
                    res.body.should.have.property('authStatus', false);
                    res.body.should.have.property('error');
                    done();
                },
                { noAuth: true });
        });

        it('Requesting publisher status should fail', function(done) {
            utils.postUrl('partner/request/publisher/1002', {},
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.headers.should.have.property('set-cookie');
                    res.body.should.have.property('authStatus', false);
                    res.body.should.have.property('error');
                    done();
                },
                { noAuth: true });
        });

        it('Requesting distributor status should fail', function(done) {
            utils.postUrl('partner/request/distributor/1002', {},
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.headers.should.have.property('set-cookie');
                    res.body.should.have.property('authStatus', false);
                    res.body.should.have.property('error');
                    done();
                },
                { noAuth: true });
        });
    });

    utils.auth({
        user: 'aseigo@kde.org',
        password: 'aseigo',
        store: 'null'
    });

    function checkPartnerList(expected, done) {
        utils.getUrl('partner/list',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('partners');
                    res.body.partners.should.eql(expected);
                    done();
                });
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
                    id: newPartnerId,
                    name: "Sometime",
                    email: "foo@sometime.org",
                    publisher: false,
                    distributor: false,
                    points: 0,
                    links: [
                        {
                            service: "blog",
                            account: "",
                            url: "http://myblog.com",
                            icon: "extern/blog.png"
                        },
                        {
                            service: "identi.ca",
                            account: "sometimes",
                            url: "",
                            icon: "extern/identica.png"
                        }
                    ],
                    assets: 0,
                    downloads: 0,
                    purchases: 0,
                    storeassets: 0,
                    stores: 0,
                    people: [
                        {
                            name: "Aaron Seigo",
                            email: "aseigo@kde.org",
                            roles: [
                                "Account Manager",
                                "Partner Manager"
                            ]
                        }
                    ]
                };
        it('creation should fail with an existing partner name', function(done) {
            utils.app.config.printErrors = false;
            var params = { name: 'KDE', email: 'foo@somewhere.org' };
            utils.postUrl('partner/create',
                params,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type', 'PartnerNameExists');
                    done();
                    utils.app.config.printErrors = true;
                });
        });

        it('creation should fail with an invalid email', function(done) {
            var params = { name: 'Somewhere', email: 'foo..somewhere.org' };
            utils.app.config.printErrors = false;
            utils.postUrl('partner/create',
                params,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type', 'InvalidEmailAddress');
                    utils.app.config.printErrors = true;
                    done();
                });
        });

        it('creation should succeed with good data', function(done) {
            var params = { name: 'Somewhere', email: 'foo@somewhere.org' };
            utils.postUrl('partner/create',
                params,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('partnerId');
                    newPartnerId = res.body.partnerId;
                    newPartnerJson.id = newPartnerId;
                    done();
                });
        });

        it('update should succeed with good data', function(done) {
            var params = { name: 'Sometime', email: 'foo@sometime.org' };
            utils.postUrl('partner/update/' + newPartnerId,
                params,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('success', true);
                    done();
                });
        });

        it('adding invalid contact links should fail', function(done) {
            var params = { service: 'Not Even Close', email: 'foo..somewhere.org' };
            utils.app.config.printErrors = false;
            var queue = async.queue(function(task, cb) {
            utils.postUrl('partner/' + task.partner + '/link/create',
                task.params,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type', task.error);
                    cb();
                });
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
                    utils.app.config.printErrors = true;
                    done();
            };
        });

        it('adding contact links with proper data should succeed', function(done) {
            var queue = async.queue(function(params, cb) {
            utils.postUrl('partner/' + newPartnerId + '/link/create',
                params,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('success', true);
                    cb();
                });
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
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('success', true);
                    done();
                });
        });

        it('listing should show new partner', function(done) {
            var expected = existingPartnerJson.slice();
            expected.push(newPartnerJson);
            checkPartnerList(expected, done);
        });

        it('should not allow updating a partner we are not a manager for', function(done) {
            var params = { name: 'Sometime', email: 'foo@sometime.org' };
            utils.app.config.printErrors = false;
            utils.postUrl('partner/update/' + 1003,
                params,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('success', false);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type', 'InvalidRole');
                    utils.app.config.printErrors = true;
                    done();
                });

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
                        res.headers.should.have.property('content-type');
                        res.body.should.have.property('success', true);
                        done();
                    });
            });

            it('should fail setting the transfer account if missing iban or swift', function(done) {
                var badAccount = JSON.parse(JSON.stringify(account));
                badAccount.swift = '';
                badAccount.iban = '';
                utils.postUrl('partner/' + newPartnerId + '/banking/account/update',
                    badAccount,
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property('content-type');
                        res.body.should.have.property('error');
                        res.body.error.should.have.property('type', 'MissingParameters');
                        done();
                    });
            });

            it('should fail setting the transfer account if missing the name', function(done) {
                var badAccount = JSON.parse(JSON.stringify(account));
                badAccount.nameOnAccount = '';
                utils.postUrl('partner/' + newPartnerId + '/banking/account/update',
                    badAccount,
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property('content-type');
                        res.body.should.have.property('error');
                        res.body.error.should.have.property('type', 'MissingParameters');
                        done();
                    });
            });

            it('should fail setting the transfer account if missing the address', function(done) {
                var badAccount = JSON.parse(JSON.stringify(account));
                badAccount.address = '';
                utils.postUrl('partner/' + newPartnerId + '/banking/account/update',
                    badAccount,
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property('content-type');
                        res.body.should.have.property('error');
                        res.body.error.should.have.property('type', 'MissingParameters');
                        done();
                    });
            });

            it('should fail setting the transfer account if missing the bank name', function(done) {
                var badAccount = JSON.parse(JSON.stringify(account));
                badAccount.bank = '';
                utils.postUrl('partner/' + newPartnerId + '/banking/account/update',
                    badAccount,
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property('content-type');
                        res.body.should.have.property('error');
                        res.body.error.should.have.property('type', 'MissingParameters');
                        done();
                    });
            });

            it('should fail setting the transfer account if missing the bank address', function(done) {
                var badAccount = JSON.parse(JSON.stringify(account));
                badAccount.bankAddress = '';
                utils.postUrl('partner/' + newPartnerId + '/banking/account/update',
                    badAccount,
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property('content-type');
                        res.body.should.have.property('error');
                        res.body.error.should.have.property('type', 'MissingParameters');
                        done();
                    });
            });

            it('should fail setting the transfer account if missing the account number', function(done) {
                var badAccount = JSON.parse(JSON.stringify(account));
                badAccount.account = '';
                utils.postUrl('partner/' + newPartnerId + '/banking/account/update',
                    badAccount,
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property('content-type');
                        res.body.should.have.property('error');
                        res.body.error.should.have.property('type', 'MissingParameters');
                        done();
                    });
            });

            it('should list the current account', function(done) {
                utils.getUrl('partner/' + newPartnerId + '/banking/account/list',
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property('content-type');
                        res.body.should.have.property('success', true);
                        res.body.accounts.should.eql([ account ]);
                        done();
                    });
            });

            it('deletion should succeed', function(done) {
                utils.getUrl('partner/' + newPartnerId + '/banking/account/delete',
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property('content-type');
                        res.body.should.have.property('success', true);
                        done();
                    });
            });

            it('should list no account', function(done) {
                utils.getUrl('partner/' + newPartnerId + '/banking/account/list',
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property('content-type');
                        res.body.should.have.property('success', true);
                        res.body.accounts.should.eql([]);
                        done();
                    });
            });
        });

        describe('role management', function(done) {
            it('should allow listing known roles', function(done) {
                utils.getUrl('partner/roles/list',
                function(res) {
                    var expected = ['Account Manager', 'Content Creator', 'Partner Manager', 'Store Manager', 'Validator'];
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('success', true);
                    res.body.should.have.property('roles');
                    res.body.roles.should.eql(expected);
                    done();
                });
            });

            it('should be able to set roles for a partner we are a manager for', function(done) {
                var params = {
                            person: 'zack@kde.org',
                            roles: [ 'Validator', 'Account Manager' ]
                         };
                utils.postUrl('partner/roles/update/' + newPartnerId,
                    params,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('success', true);
                    var expected = existingPartnerJson.slice();
                    expected.push(newPartnerJson);
                    expected[2].people = [
                        {
                            "name": "Aaron Seigo",
                            "email": "aseigo@kde.org",
                            "roles": [
                                "Account Manager",
                                "Partner Manager"
                            ]
                        },
                        {
                            "name": "Zack Rusin",
                            "email": "zack@kde.org",
                            "roles": [
                                "Account Manager",
                                "Validator"
                            ]
                        }];
                    checkPartnerList(expected, done);
                });

               });

            it('should be able to delete a role for a partner we are a manager for', function(done) {
               var params = {
                   person: 'zack@kde.org',
                   roles: [ 'Account Manager' ]
               };
                utils.postUrl('partner/roles/update/' + newPartnerId,
                    params,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('success', true);
                    var expected = existingPartnerJson.slice();
                    expected.push(newPartnerJson);
                    expected[2].people = [{
                        "name": "Aaron Seigo",
                        "email": "aseigo@kde.org",
                        "roles": [
                            "Account Manager",
                            "Partner Manager"
                        ]
                    }, {
                        "name": "Zack Rusin",
                        "email": "zack@kde.org",
                        "roles": [
                            "Account Manager"
                        ]
                    }];
                    checkPartnerList(expected, done);
                });

               });

            it('should be able to delete all roles for a person with a partner we are a manager for', function(done) {
                var params = {
                    person: 'zack@kde.org',
                    roles: []
                };

                utils.postUrl('partner/roles/update/' + newPartnerId,
                    params,
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property('content-type');
                        res.body.should.have.property('success', true);
                        var expected = existingPartnerJson.slice();
                        expected.push(newPartnerJson);
                        expected[2].people = [
                            {
                                "name": "Aaron Seigo",
                                "email": "aseigo@kde.org",
                                "roles": [
                                    "Account Manager",
                                    "Partner Manager"
                                ]
                            }
                        ];

                        checkPartnerList(expected, done);
                    });
            });
        });

        describe('publisher and distributors', function(done) {
            it('request publisher status', function(done) {
               var params = {
                    reason: 'So we can upload content.'
                };

                utils.postUrl('partner/request/publisher/' + newPartnerId,
                    params,
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property('content-type');
                        res.body.should.have.property('success', true);
                        done();
                    });
            });

            it('request distributor status', function(done) {
               var params = {
                    reason: 'So we can make stores.'
                };

                utils.postUrl('partner/request/distributor/' + newPartnerId,
                    params,
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property('content-type');
                        res.body.should.have.property('success', true);
                        done();
                    });
            });

            var requests = 0;

            it('should list both requests for aaron (Management Group Validator)', function(done) {
                utils.getUrl('partner/request/list',
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property('content-type');
                        res.body.should.have.property('success', true);
                        res.body.should.have.property('requests');
                        res.body.requests.length.should.eql(2);
                        requests = res.body.requests;
                        done();
                    });
            });

            it('should allow a Management group validator to approve a request', function(done) {
                utils.postUrl('partner/request/manage/' + requests[0].id,
                    { approved: true },
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property('content-type');
                        res.body.should.have.property('success', true);
                        done();
                    });
            });

            it('should allow a Management group validator to reject a request', function(done) {
                utils.postUrl('partner/request/manage/' + requests[1].id,
                    { approved: false,
                      reason: 'Rolled the dice, came up snakey-eyes.'},
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property('content-type');
                        res.body.should.have.property('success', true);
                        done();
                    });
            });

            it('should reject a Management group validator to approve a non-existent request', function(done) {
                utils.postUrl('partner/request/manage/' + requests[0].id,
                    { approved: true },
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property('content-type');
                        res.body.should.have.property('success', false);
                        res.body.should.have.property('error');
                        res.body.error.should.have.property('type', 'InvalidRequestId');
                        done();
                    });
            });
        });

        utils.auth({
            user: 'zack@kde.org',
            password: 'zack',
            store: 'null'
        });

        describe('role management with unpriveleged account', function(done) {
            it('should not list requests for zack', function(done) {
                utils.getUrl('partner/request/list',
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property('content-type');
                        res.body.should.have.property('success', false);
                        res.body.should.not.have.property('requests');
                        res.body.should.have.property('error');
                        res.body.error.should.have.property('type', 'Unauthorized');
                        done();
                    });
            });

            it('should not allow zack to approve requests', function(done) {
                utils.getUrl('partner/request/list',
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property('content-type');
                        res.body.should.have.property('success', false);
                        res.body.should.have.property('error');
                        res.body.error.should.have.property('type', 'Unauthorized');
                        done();
                    });
            });
        });

        describe('Partner deletion, fail', function(done) {
            it('zack should not be able to delete', function(done) {
                utils.getUrl('partner/delete/'+newPartnerId,
                    function(res) {
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property('content-type');
                        res.body.success.should.equal(false);
                        res.body.error.type.should.equal('Unauthorized');
                        done();
                    });
            });
         });

        utils.auth({
            user: 'aseigo@kde.org',
            password: 'aseigo',
            store: 'null'
        });

        describe('Partner deletion, success', function(done) {
            it('deletion should succeed', function(done) {
                utils.getUrl('partner/delete/'+newPartnerId,
                    function(res) {
                        //console.log(res.body);
                        res.statusCode.should.equal(200);
                        res.headers.should.have.property('content-type');
                        res.body.success.should.equal(true);
                        done();
                    });
            });
        });

    });
});
