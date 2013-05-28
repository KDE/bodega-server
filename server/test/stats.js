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
            var expected = {
                "userId": 1,
                "device":"VIVALDI-1",
                "authStatus":true,
                "points" : 10000,
                "imageUrls": {
                    "tiny":"http://0.0.0.0:3000/images/22",
                    "small":"http://0.0.0.0:3000/images/32",
                    "medium":"http://0.0.0.0:3000/images/64",
                    "large":"http://0.0.0.0:3000/images/128",
                    "huge":"http://0.0.0.0:3000/images/512",
                    "previews":"http://0.0.0.0:3000/images/previews"
                }
            };
            utils.getUrl(
                server,
                '/bodega/v1/json/auth?auth_user=zack@kde.org&auth_password=zack&auth_device=VIVALDI-1',
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

 
        it('stats without asset numbers', function(done){
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
                    var stats = res.body.stats[0];
                    stats.assets.should.be.eql(5);
                    stats.totalpoints.should.be.eql(1700);
                    stats.pointstoparticipant.should.be.eql(1605);
                    stats.pointstostore.should.be.eql(90);
                    done();
                },
                cookie);
        });

        it('stats with one asset number', function(done){
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
                    var expected = {
                        assets: [3, 2],
                        totalpoints: [1500, 200],
                        pointstoparticipant: [1425, 180],
                        pointstostore: [70, 20]
                    }
                    res.body.stats.length.should.equal(1)

                    var stats = res.body.stats[0];
                    stats.assets.should.be.eql(3);
                    stats.totalpoints.should.be.eql(1500);
                    stats.pointstoparticipant.should.be.eql(1425);
                    stats.pointstostore.should.be.eql(70);

                    done();
                },
                cookie);
        });

        it('stats with two asset numbers', function(done){
            var query = {
                assets: [3,4]
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
                        assets: [3, 2],
                        totalpoints: [1500, 200],
                        pointstoparticipant: [1425, 180],
                        pointstostore: [70, 20]
                    }
                    res.body.stats.length.should.equal(2)
                    for (var i in res.body.stats) {
                        var stats = res.body.stats[i];
                        stats.assets.should.be.eql(expected.assets[i]);
                        stats.totalpoints.should.be.eql(expected.totalpoints[i]);
                        stats.pointstoparticipant.should.be.eql(expected.pointstoparticipant[i]);
                        stats.pointstostore.should.be.eql(expected.pointstostore[i]);
                    }
                    done();
                },
                cookie);
        });
    });
});
