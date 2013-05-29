/* 
    Copyright 2012 Coherent Theory LLC

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

var server = require('../app.js');
var utils = require('./support/http');
var querystring = require('querystring');

describe('Stats', function(){
    var cookie;
    describe('initialization', function(){
        it('authorize correctly.', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/auth?auth_user=zack@kde.org&auth_password=zack&auth_store=VIVALDI-1',
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

 
        it('Points stats without asset numbers', function(done){
            utils.getUrl(
                server,
                '/bodega/v1/json/stats/assets',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('stats');

                    var expected = {
                        dateof: ["2013-04-30T22:00:00.000Z", "2013-05-31T22:00:00.000Z", "2013-06-30T22:00:00.000Z"],
                        total: [1605, 470, 280],
                    }

                    //res.body.stats.length.should.equal(2)
                    for (var i in res.body.stats) {
                        var stats = res.body.stats[i];

                        stats.dateof.should.be.eql(expected.dateof[i]);
                        stats.total.should.be.eql(expected.total[i]);
                    }

                    done();
                },
                cookie);
        });

        it('Points stats with one asset number', function(done){
            var query = {
                assets: [3]
            }
            utils.getUrl(
                server,
                '/bodega/v1/json/stats/assets?'+querystring.stringify(query),
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('stats');

                    res.body.stats.length.should.equal(1)

                    var stats = res.body.stats[0];
                    stats.dateof.should.be.eql("2013-05-31T22:00:00.000Z");
                    stats.asset3.should.be.eql(0);


                    done();
                },
                cookie);
        });

        it('Points stats with four asset numbers', function(done) {
            var query = {
                assets: [2,3,4,7]
            }
            utils.getUrl(
                server,
                '/bodega/v1/json/stats/assets?'+querystring.stringify(query),
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('stats');
                    var expected = {
                        dateof: ["2013-04-30T22:00:00.000Z", "2013-05-31T22:00:00.000Z", "2013-06-30T22:00:00.000Z", "2013-05-31T22:00:00.000Z"],
                        asset2: [0, 190, 0, 0],
                        asset3: [1425, 280, 280, 0],
                        asset4: [180, 0, 0, 0],
                        asset7: [0, 0, 0, 0]
                    }

                    //res.body.stats.length.should.equal(2)
                    for (var i in res.body.stats) {
                        var stats = res.body.stats[i];

                        stats.dateof.should.be.eql(expected.dateof[i]);
                        stats.asset2.should.be.eql(expected.asset2[i]);
                        stats.asset3.should.be.eql(expected.asset3[i]);
                        stats.asset4.should.be.eql(expected.asset4[i]);
                        stats.asset7.should.be.eql(expected.asset7[i]);
                    }
                    done();
                },
                cookie);
        });



        //Downloads
        it('Downloads stats with four asset numbers', function(done) {
            var query = {
                assets: [2,3,4,7],
                metric: "downloads"
            }
            utils.getUrl(
                server,
                '/bodega/v1/json/stats/assets?'+querystring.stringify(query),
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property(
                        'content-type',
                        'application/json; charset=utf-8');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('stats');
                    var expected = {
                        dateof: ["2013-04-30T22:00:00.000Z", "2013-05-31T22:00:00.000Z", "2013-06-30T22:00:00.000Z", "2013-05-31T22:00:00.000Z"],
                        asset2: [0, 190, 0, 0],
                        asset3: [1425, 280, 280, 0],
                        asset4: [180, 0, 0, 0],
                        asset7: [0, 0, 0, 0]
                    }

                    //res.body.stats.length.should.equal(2)
                    for (var i in res.body.stats) {
                        var stats = res.body.stats[i];

                        stats.dateof.should.be.eql(expected.dateof[i]);
                        stats.asset2.should.be.eql(expected.asset2[i]);
                        stats.asset3.should.be.eql(expected.asset3[i]);
                        stats.asset4.should.be.eql(expected.asset4[i]);
                        stats.asset7.should.be.eql(expected.asset7[i]);
                    }
                    done();
                },
                cookie);
        });
    });
});
