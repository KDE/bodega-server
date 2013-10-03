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

var utils = require('./support/utils');
var assert = require('assert');

var userInfo;

describe('Create user', function() {

    it('register successful', function(done) {
        utils.getUrl('register?firstname=antonis&lastname=tsiapaliokas&email=kok3rs@gmail.com&password=123456789',
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property('content-type');
                res.body.should.have.property('userId');
                userInfo = {
                    'email' : 'kok3rs@gmail.com',
                    'id' : res.body.userId,
                };

                pg.connect(utils.dbConnectionString, function(err, client, finis) {
                    client.query("select ct_createAccountActivationCode($1) as activationcode;",
                                 [res.body.userId],
                                 function(err, res) {
                                     userInfo.code = res.rows[0].activationcode;
                                     finis();
                                     done();
                                 });
                    });
            },
            { noAuth: true });
    });

    describe('needs to activate', function() {
        it('should activate', function(done) {
            utils.getHtml('register/confirm?' + queryString.stringify(userInfo),
                function(res) {
                    var activationState = res.body.indexOf('Success!') > -1;

                    assert.equal(activationState, true);
                    done();
                },
                { noAuth: true });
        });
    });
});

describe('Password reset', function() {
    var resetCode;
    it('reset request should require an email parameter', function(done) {
        utils.getUrl('participant/resetRequest',
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property('content-type');
                res.body.should.have.property('success', false);
                res.body.should.not.have.property('code');
                res.body.should.have.property('error');
                res.body.error.should.have.property('type', 'MissingParameters');
                done();
            },
            { noAuth: true } );
    });

    it('reset request should fail with an invalid email', function(done) {
        utils.getUrl('participant/resetRequest?email=foo@bar.com',
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property('content-type');
                res.body.should.have.property('success', false);
                res.body.should.not.have.property('code');
                res.body.should.have.property('error');
                res.body.error.should.have.property('type', 'NoMatch');
                done();
            },
            { noAuth: true } );
    });

    it('reset request should succeed with a code with a valid email', function(done) {
        utils.getUrl('participant/resetRequest?email=kok3rs@gmail.com',
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property('content-type');
                res.body.should.have.property('success', true);
                res.body.should.have.property('message');
                res.body.should.have.property('code');
                resetCode = res.body.code;
                done();
            },
            { noAuth: true } );
    });

    it('should return the reset form with the code returned', function(done) {
        utils.getHtml('participant/resetPassword?code=' + resetCode + '&email=kok3rs%40gmail.com&id=' + userInfo.id,
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property('content-type');
                assert(res.body.indexOf('Reset Password For Your') > -1);
                done();
            },
            { noAuth: true } );
    });

    it('a reset with a bad code should fail', function(done) {
        utils.postUrl('participant/resetPassword?code=192839283&email=kok3rs%40gmail.com&id=' + userInfo.id,
                      { password1: "newpassword" },
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property('content-type');
                assert(res.body.indexOf('Specified password reset code was invalid') > -1);
                done();
            },
            { noAuth: true,
              html: true} );
    });

    it('a reset code with the wrong id should fail', function(done) {
        utils.postUrl('participant/resetPassword?code=' + resetCode + '&email=kok3rs%40gmail.com&id=1',
                      { password1: "newpassword" },
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property('content-type');
                assert(res.body.indexOf('Specified password reset code was invalid') > -1);
                done();
            },
            { noAuth: true,
              html: true} );
    });

    it('a reset with no code should fail', function(done) {
        utils.postUrl('participant/resetPassword?email=kok3rs%40gmail.com&id=' + userInfo.id,
                      { password1: "newpassword" },
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property('content-type');
                assert(res.body.indexOf('Arguments missing') > -1);
                done();
            },
            { noAuth: true,
              html: true} );
    });

    it('a reset with no email should fail', function(done) {
        utils.postUrl('participant/resetPassword?code=192839283&id=' + userInfo.id,
                      { password1: "newpassword" },
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property('content-type');
                assert(res.body.indexOf('Arguments missing') > -1);
                done();
            },
            { noAuth: true,
              html: true} );
    });

    it('a reset with no id should fail', function(done) {
        utils.postUrl('participant/resetPassword?code=192839283&email=kok3rs%40gmail.com',
                      { password1: "newpassword" },
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property('content-type');
                assert(res.body.indexOf('Arguments missing') > -1);
                done();
            },
            { noAuth: true,
              html: true} );
    });

    it('a reset with no new password should fail', function(done) {
        utils.postUrl('participant/resetPassword?code=192839283&email=kok3rs%40gmail.com&id=' + userInfo.id,
                      { },
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property('content-type');
                assert(res.body.indexOf('Arguments missing') > -1);
                done();
            },
            { noAuth: true,
              html: true} );
    });

    it('a proper reset should complete successfully', function(done) {
        utils.postUrl('participant/resetPassword?code=' + resetCode + '&email=kok3rs%40gmail.com&id=' + userInfo.id,
                      { password1: "newpassword" },
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property('content-type');
                assert(res.body.indexOf('Password successfully reset') > -1);
                done();
            },
            { noAuth: true,
              html: true} );
    });
});

utils.auth();

describe('Deactivate user', function() {
    it('succeeds', function(done) {
        utils.getUrl('participant/changeAccountDetails&active=false',
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property('content-type');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('store', 'KDE-1');
                res.body.should.have.property('points');
                res.body.should.have.property('success');
                done();
            });
    });

    after(function(done) {
        pg.connect(utils.dbConnectionString, function(err, client, finis) {
                   client.query("delete from people where email = 'kok3rs@gmail.com'", [],
                        function(err, res) {
                           finis();
                           done();
                       });
                   });
    });
});

function checkPersonInfo(key, value, done)
{
    //console.log("checking " + key + " == " + value);
    utils.getUrl('participant/info',
        function(res) {
            res.statusCode.should.equal(200);
            res.headers.should.have.property('content-type');
            res.body.should.have.property('success', true);
            res.body.should.have.property(key, value);
            done();
        });
}

describe('Changing account information', function() {
    it('change first name to "Bunny"', function(done) {
        var query = {
            firstName: 'Bunny'
        };
        utils.postUrl('participant/changeAccountDetails', query,
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property('content-type');
                res.body.should.have.property('success', true);
                checkPersonInfo('firstName', 'Bunny', done);
            });
    });

    it('change middle name to "Rabbit"', function(done) {
        var query = {
            middleNames: 'Rabbit'
        };
        utils.postUrl('participant/changeAccountDetails', query,
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property('content-type');
                res.body.should.have.property('success', true);
                checkPersonInfo('middleNames', 'Rabbit', done);
            });
    });

    it('change last name to "Foofoo"', function(done) {
        var query = {
            lastName: 'Foofoo'
        };
        utils.postUrl('participant/changeAccountDetails', query,
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property('content-type');
                res.body.should.have.property('success', true);
                checkPersonInfo('lastName', 'Foofoo', done);
            });
    });

    it('change email to "bunny_rabbit@foofoo.com"', function(done) {
        var query = {
            email: 'bunny_rabbit@foofoo.com'
        };
        utils.postUrl('participant/changeAccountDetails', query,
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property('content-type');
                res.body.should.have.property('success', true);
                checkPersonInfo('email', 'bunny_rabbit@foofoo.com', done);
            });
    });

    it('invalid email should fail', function(done) {
        var query = {
            email: 'bunny_rabbit'
        };

        utils.app.config.printErrors = false;
        utils.postUrl('participant/changeAccountDetails', query,
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property('content-type');
                res.body.should.have.property('success', false);
                res.body.should.have.property('error');
                res.body.error.should.have.property('type', 'InvalidEmailAddress');
                done();
                utils.app.config.printErrors = true;
            });
    });

    it('duplicate email should fail', function(done) {
        var query = {
            email: 'aseigo@kde.org'
        };
        utils.postUrl('participant/changeAccountDetails', query,
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property('content-type');
                res.body.should.have.property('success', false);
                res.body.should.have.property('error');
                res.body.error.should.have.property('type', 'AccountExists');
                done();
            });
    });

    after(function(done) {
        pg.connect(utils.dbConnectionString, function(err, client, finis) {
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
    it('rejects short passwords', function(done) {
        var query = {
            newPassword: 'zack'
        };
        utils.getUrl('participant/changePassword?' + queryString.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property('content-type');
                res.body.should.have.property('success', false);
                res.body.should.have.property('error');
                res.body.error.should.have.property('type', 'PasswordTooShort');
                done();
            });
    });

    it('rejects changing to no password', function(done) {
        utils.getUrl('participant/changePassword',
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property('content-type');
                res.body.should.have.property('success', false);
                res.body.should.have.property('error');
                res.body.error.should.have.property('type', 'MissingParameters');
                done();
            });
    });

    it('change the password to "alphabetical"', function(done) {
        var query = {
            newPassword: 'alphabetical'
        };
        utils.getUrl('participant/changePassword?' + queryString.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property('content-type');
                res.body.should.have.property('success', true);
                done();
            });
    });

    utils.auth({ password: 'alphabetical' });

    after(function(done) {
        pg.connect(utils.dbConnectionString, function(err, client, finis) {
                   client.query("update people set password = '$2a$10$Iejk3uw6uGFCGR5OKaOOZO2tmnlIhPCsCvw7G1pLa81QH4fonDC.C' where id = 2", [],
                   function(err, result) {
                           done();
                   });
        });
    });
});

describe('Getting account information', function() {
    it('should fail to get personal information before authorization', function(done) {
        utils.getUrl('participant/info',
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property('content-type');
                res.body.should.have.property('error');
                res.body.error.should.have.property('type', 'Unauthorized');
                done();
            },
            { noAuth: true });
    });

    it('should fail to get a history before authorization', function(done) {
        utils.getUrl('participant/history',
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property('content-type');
                res.body.should.have.property('error');
                res.body.error.should.have.property('type', 'Unauthorized');
                done();
            },
            { noAuth: true });
    });

    utils.auth();

    it('fetches personal information', function(done) {
        utils.getUrl('participant/info',
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property('content-type');
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
            });
    });

    it('fetch history', function(done) {
        utils.getUrl('participant/history',
            function(res) {
                var expected = [
                    {
                        "category": "Download",
                        "what": "Dice",
                        "date": "2013-05-26T02:00:00.000Z",
                        "comment": "Version: 1"
                    },
                    {
                        "category": "Download",
                        "what": "15 Puzzle",
                        "date": "2013-05-26T02:00:00.000Z",
                        "comment": "Version: 1"
                    },
                    {
                        "category": "Purchase",
                        "what": "15 Puzzle",
                        "date": "2013-05-26T00:00:00.000Z",
                        "comment": ""
                    },
                    {
                        "category": "Download",
                        "what": "Dice",
                        "date": "2013-05-26T00:00:00.000Z",
                        "comment": "Version: 1"
                    },
                    {
                        "category": "Purchase",
                        "what": "Dice",
                        "date": "2013-05-26T00:00:00.000Z",
                        "comment": ""
                    },
                    {
                        "category": "Purchase",
                        "what": "Diamond Juice",
                        "date": "2013-05-25T13:26:00.000Z",
                        "comment": ""
                    },
                    {
                        "category": "Download",
                        "what": "Diamond Juice",
                        "date": "2013-05-25T13:26:00.000Z",
                        "comment": "Version: 1"
                    }
                ];
                res.statusCode.should.equal(200);
                res.headers.should.have.property('content-type');
                res.body.should.have.property('success', true);
                res.body.should.have.property('history');
                res.body.history.should.eql(expected);
                done();
            });
    });
});
