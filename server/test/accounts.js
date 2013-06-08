/*
    Copyright 2012 Antonis Tsiapaliokas <kok3rs@gmail.com>

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
var queryString = require('querystring');

var server = require('../app.js');
var utils = require('./support/http.js');
var assert = require('assert');

describe('Create user', function() {
    var userInfo;
    it('register successful', function(done) {
        utils.getUrl(
            server,
            '/bodega/v1/json/register?firstname=antonis&lastname=tsiapaliokas&email=kok3rs@gmail.com&password=123456789',
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json; charset=utf-8');
                res.body.should.have.property('userId');
                res.body.should.have.property('confirmationCode');
                userInfo = {
                    'email' : 'kok3rs@gmail.com',
                    'id' : res.body.userId,
                    'code': res.body.confirmationCode
                };
                done();
            });
    });
    describe('needs to activate', function() {
        it('should activate', function(done) {
            utils.getUrl(
                server,
                '/bodega/v1/json/register/confirm?' + queryString.stringify(userInfo),
                function(res) {
                    var activationState = res.body.indexOf('Success!') > -1;

                    assert.equal(activationState, true);
                    done();
                });
        });
    });
});

describe('Deactivate user', function() {
    var cookie;
    describe('needs to authorize first', function() {
        it('authotize correctly', function(done) {
            utils.getUrl(server,
            '/bodega/v1/json/auth?auth_user=kok3rs@gmail.com&auth_password=123456789&auth_device=VIVALDI-1',
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json; charset=utf-8');
                res.headers.should.have.property('set-cookie');
                cookie = res.headers['set-cookie'];
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('device', 'VIVALDI-1');
                res.body.should.have.property('store', 'VIVALDI-1');
                res.body.should.have.property('points');
                res.body.should.have.property('success', true);
                res.body.should.have.property('active', true);
                done();
            });
        });
    });

    describe('disable account', function() {
        it('disable successfuly', function(done) {
            utils.getUrl(
                server,
                '/bodega/v1/json/participant/changeAccountDetails&active=false',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('device', 'VIVALDI-1');
                    res.body.should.have.property('store', 'VIVALDI-1');
                    res.body.should.have.property('points');
                    res.body.should.have.property('success');
                    done();
                },
                cookie);
         });
    });

    after(function(done) {
        var connectionString = app.config.database.protocol + "://" +
                               app.config.database.user + ":" + app.config.database.password +
                               "@" + app.config.database.host + "/" +
                               app.config.database.name;

        pg.connect(connectionString, function(err, client, finis) {
                   client.query("delete from people where email = 'kok3rs@gmail.com'", [],
                        function(err, res) {
                           finis();
                           done();
                       });
                   });
    });
});

function checkPersonInfo(cookie, key, value, done)
{
    //console.log("checking " + key + " == " + value);
    utils.getUrl(
        server,
        '/bodega/v1/json/participant/info',
        function(res) {
            res.statusCode.should.equal(200);
            res.headers.should.have.property(
                'content-type',
                'application/json; charset=utf-8');
            res.body.should.have.property('success', true);
            res.body.should.have.property(key, value);
            done();
        },
        cookie);
}

describe('Changing account information', function() {
    var cookie;
    it('must authorize first', function(done) {
        utils.getUrl(
            server,
            '/bodega/v1/json/auth?auth_user=zack@kde.org&auth_password=zack&auth_store=KDE-1',
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
    
    it('change first name to "Bunny"', function(done) {
        var query = {
            firstName: 'Bunny'
        };
        utils.postUrl(
            server,
            '/bodega/v1/json/participant/changeAccountDetails', query,
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json; charset=utf-8');
                res.body.should.have.property('success', true);
                checkPersonInfo(cookie, 'firstName', 'Bunny', done);
            },
            cookie);
    });
    
    it('change middle name to "Rabbit"', function(done) {
        var query = {
            middleNames: 'Rabbit'
        };
        utils.postUrl(
            server,
            '/bodega/v1/json/participant/changeAccountDetails', query,
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json; charset=utf-8');
                res.body.should.have.property('success', true);
                checkPersonInfo(cookie, 'middleNames', 'Rabbit', done);
            },
            cookie);
    });
    
    it('change last name to "Foofoo"', function(done) {
        var query = {
            lastName: 'Foofoo'
        };
        utils.postUrl(
            server,
            '/bodega/v1/json/participant/changeAccountDetails', query,
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json; charset=utf-8');
                res.body.should.have.property('success', true);
                checkPersonInfo(cookie, 'lastName', 'Foofoo', done);
            },
            cookie);
    });
    
    it('change email to "bunny_rabbit@foofoo.com"', function(done) {
        var query = {
            email: 'bunny_rabbit@foofoo.com'
        };
        utils.postUrl(
            server,
            '/bodega/v1/json/participant/changeAccountDetails', query,
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json; charset=utf-8');
                res.body.should.have.property('success', true);
                checkPersonInfo(cookie, 'email', 'bunny_rabbit@foofoo.com', done);
            },
            cookie);
    });
    
    it('invalid email should fail', function(done) {
        var query = {
            email: 'bunny_rabbit'
        };
        utils.postUrl(
            server,
            '/bodega/v1/json/participant/changeAccountDetails', query,
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json; charset=utf-8');
                res.body.should.have.property('success', false);
                res.body.should.have.property('error');
                res.body.error.should.have.property('type', 'InvalidEmailAddress');
                done();
            },
            cookie);
    });
    
    it('duplicate email should fail', function(done) {
        var query = {
            email: 'aseigo@kde.org'
        };
        utils.postUrl(
            server,
            '/bodega/v1/json/participant/changeAccountDetails', query,
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json; charset=utf-8');
                res.body.should.have.property('success', false);
                res.body.should.have.property('error');
                res.body.error.should.have.property('type', 'AccountExists');
                done();
            },
            cookie);
    });
    
    after(function(done) {
        var connectionString = app.config.database.protocol + "://" +
                               app.config.database.user + ":" + app.config.database.password +
                               "@" + app.config.database.host + "/" +
                               app.config.database.name;

        pg.connect(connectionString, function(err, client, finis) {
                   client.query("update people set email = $1, firstname = $2, middlenames = $3, lastname = $4 where id = 2",
                   ['zack@kde.org', 'Zack', null, 'Rusin'],
                        function(err, res) {
                           finis();
                           done();
                       });
                   });
    });
});

describe('Changing passwords', function() {
    var cookie;
    it('authorizes correctly with password "zack"', function(done) {
        utils.getUrl(
            server,
            '/bodega/v1/json/auth?auth_user=zack@kde.org&auth_password=zack&auth_store=KDE-1',
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

    it('change the password to "alphabetical"', function(done) {
        var query = {
            newPassword: 'alphabetical'
        };
        utils.getUrl(
            server,
            '/bodega/v1/json/participant/changePassword?' + queryString.stringify(query),
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
    
    it('authorizes correctly with password "alphabetical"', function(done) {
        utils.getUrl(
            server,
            '/bodega/v1/json/auth?auth_user=zack@kde.org&auth_password=alphabetical&auth_store=KDE-1',
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

    it('rejects short passwords', function(done) {
        var query = {
            newPassword: 'zack'
        };
        utils.getUrl(
            server,
            '/bodega/v1/json/participant/changePassword?' + queryString.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json; charset=utf-8');
                res.body.should.have.property('success', false);
                res.body.should.have.property('error');
                res.body.error.should.have.property('type', 'PasswordTooShort');
                done();
            },
            cookie);
    });

    it('rejects changing to no password', function(done) {
        utils.getUrl(
            server,
            '/bodega/v1/json/participant/changePassword',
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json; charset=utf-8');
                res.body.should.have.property('success', false);
                res.body.should.have.property('error');
                res.body.error.should.have.property('type', 'MissingParameters');
                done();
            },
            cookie);
    });

    after(function(done) {
        var connectionString = app.config.database.protocol + "://" +
                               app.config.database.user + ":" + app.config.database.password +
                               "@" + app.config.database.host + "/" +
                               app.config.database.name;

        pg.connect(connectionString, function(err, client, finis) {
                   client.query("update people set password = '$2a$10$Iejk3uw6uGFCGR5OKaOOZO2tmnlIhPCsCvw7G1pLa81QH4fonDC.C' where id = 2", [],
                   function(err, result) {
                           done();
                   });
        });
    });
});

describe('getting account information', function() {
    var cookie;
    it('should fail to get personal information before authorization', function(done) {
        utils.getUrl(
            server,
            '/bodega/v1/json/participant/info',
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json; charset=utf-8');
                res.body.should.have.property('error');
                res.body.error.should.have.property('type', 'Unauthorized');
                done();
            });
    });

    it('should fail to get a history before authorization', function(done) {
        utils.getUrl(
            server,
            '/bodega/v1/json/participant/history',
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json; charset=utf-8');
                res.body.should.have.property('error');
                res.body.error.should.have.property('type', 'Unauthorized');
                done();
            });
    });

    it('authorizes correctly', function(done) {
        utils.getUrl(
            server,
            '/bodega/v1/json/auth?auth_user=zack@kde.org&auth_password=zack&auth_store=KDE-1',
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

    it('fetches personal information', function(done) {
        utils.getUrl(
            server,
            '/bodega/v1/json/participant/info',
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json; charset=utf-8');
                res.body.should.have.property('success', true);
                res.body.should.have.property('storeCount');
                res.body.should.have.property('pointsEarned');
                res.body.should.have.property('pointsOwed');
                res.body.should.have.property('points');
                res.body.should.have.property('organization');
                res.body.should.have.property('firstName', 'Zack');
                res.body.should.have.property('lastName', 'Rusin');
                res.body.should.have.property('email', 'zack@kde.org');
                res.body.should.have.property('active', true);
                done();
            },
            cookie);
    });

    it('fetch history', function(done) {
        utils.getUrl(
            server,
            '/bodega/v1/json/participant/history',
            function(res) {
                var expected = [
                    {
                        "category": "Download",
                        "what": "dice",
                        "date": "2013-05-26T02:00:00.000Z",
                        "comment": "Version: 1"
                    },
                    {
                        "category": "Purchase",
                        "what": "dice",
                        "date": "2013-05-26T00:00:00.000Z",
                        "comment": ""
                    },
                    {
                        "category": "Download",
                        "what": "dice",
                        "date": "2013-05-26T00:00:00.000Z",
                        "comment": "Version: 1"
                    },
                    {
                        "category": "Download",
                        "what": "diamond",
                        "date": "2013-05-25T13:26:00.000Z",
                        "comment": "Version: 1"
                    },
                    {
                        "category": "Purchase",
                        "what": "diamond",
                        "date": "2013-05-25T13:26:00.000Z",
                        "comment": ""
                    }
                ];
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                res.body.should.have.property('success', true);
                res.body.should.have.property('history');
                res.body.history.should.eql(expected);
                done();
            },
            cookie);
    });
});
