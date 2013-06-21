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

var pg = require('pg');
var queryString = require('qs');

var server = require('../app.js');
var utils = require('./support/http');

describe('Partner management', function() {
    var cookie;

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
                    var expected = [
                        {
                            id: 1002,
                            name: 'KDE',
                            email: 'info@kde.org',
                            publisher: false,
                            distributor: true,
                            points: 0,
                            links: [
                             {
                                 "type": "blog",
                                 "url": "http://planet.kde.org",
                                 "icon": "extern/blog.png"
                             },
                             {
                                 "type": "website",
                                 "url": "http://kde.org",
                                 "icon": ""
                             }
                          ]
                       }
                    ];
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

        after(function(done) {
            if (newPartnerId < 1) {
                return;
            }

            var connectionString = server.config.database.protocol + "://" +
                                   server.config.database.user + ":" + server.config.database.password +
                                   "@" + server.config.database.host + "/" +
                                   server.config.database.name;

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
