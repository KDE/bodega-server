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

 
        //Granularity: MONTH
        it('Points stats without asset numbers: month granularity', function(done){
            //not setting metrics there, assumes that without it goes to points by default
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

                    res.body.stats.length.should.equal(3)
                    for (var i in res.body.stats) {
                        var stats = res.body.stats[i];

                        stats.dateof.should.be.eql(expected.dateof[i]);
                        stats.total.should.be.eql(expected.total[i]);
                    }

                    done();
                },
                cookie);
        });

        it('Points stats with one asset number: month granularity', function(done) {
            var query = {
                assets: [3],
                metric: "points"
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
                        dateof: ["2013-04-30T22:00:00.000Z", "2013-05-31T22:00:00.000Z", "2013-06-30T22:00:00.000Z"],
                        asset3: [1425, 280, 280],
                    }

                    res.body.stats.length.should.equal(3)
                    for (var i in res.body.stats) {
                        var stats = res.body.stats[i];

                        stats.dateof.should.be.eql(expected.dateof[i]);
                        stats.asset3.should.be.eql(expected.asset3[i]);
                    }

                    done();
                },
                cookie);
        });

        it('Points stats with four asset numbers: month granularity', function(done) {
            var query = {
                assets: [2,3,4,7],
                metric: "points"
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
                        dateof: ["2013-04-30T22:00:00.000Z", "2013-05-31T22:00:00.000Z", "2013-06-30T22:00:00.000Z"],
                        asset2: [0, 190, 0],
                        asset3: [1425, 280, 280],
                        asset4: [180, 0, 0],
                        asset7: [0, 0, 0]
                    }

                    res.body.stats.length.should.equal(3)
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
        it('Downloads stats without asset numbers: month granularity', function(done) {
            var query = {
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
                        dateof: ["2013-04-30T22:00:00.000Z", "2013-05-31T22:00:00.000Z", "2013-06-30T22:00:00.000Z", "2013-08-31T22:00:00.000Z", "2013-09-30T22:00:00.000Z"],
                        total: [8, 3, 2, 1, 1]
                    }

                    res.body.stats.length.should.equal(5)
                    for (var i in res.body.stats) {
                        var stats = res.body.stats[i];
                        stats.dateof.should.be.eql(expected.dateof[i]);
                        stats.total.should.be.eql(expected.total[i]);
                    }
                    done();
                },
                cookie);
        });

        it('Downloads stats with one asset numbers: month granularity', function(done) {
            var query = {
                assets: [3],
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
                        dateof: ["2013-04-30T22:00:00.000Z", "2013-05-31T22:00:00.000Z", "2013-06-30T22:00:00.000Z", "2013-08-31T22:00:00.000Z"],
                        asset3: [6, 1, 2, 1],
                    }

                    res.body.stats.length.should.equal(4)
                    for (var i in res.body.stats) {
                        var stats = res.body.stats[i];
                        
                        stats.dateof.should.be.eql(expected.dateof[i]);
                        stats.asset3.should.be.eql(expected.asset3[i]);
                    }
                    done();
                },
                cookie);
        });

        it('Downloads stats with four asset numbers: month granularity', function(done) {
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
                        dateof: ["2013-04-30T22:00:00.000Z", "2013-05-31T22:00:00.000Z", "2013-06-30T22:00:00.000Z", "2013-08-31T22:00:00.000Z", "2013-09-30T22:00:00.000Z"],
                        asset2: [0, 1, 0, 0, 1],
                        asset3: [6, 1, 2, 1, 0],
                        asset4: [2, 1, 0, 0, 0],
                        asset7: [0, 0, 0, 0, 0]
                    }

                    res.body.stats.length.should.equal(5)
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

        it('Purchases count stats without numbers', function(done) {
            var query = {
                metric: "count"
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
                        dateof: ["2013-04-30T22:00:00.000Z", "2013-05-31T22:00:00.000Z", "2013-06-30T22:00:00.000Z"],
                        total: [5, 2, 1]
                    }

                    res.body.stats.length.should.equal(3)
                    for (var i in res.body.stats) {
                        var stats = res.body.stats[i];
                        stats.dateof.should.be.eql(expected.dateof[i]);
                        stats.total.should.be.eql(expected.total[i]);
                    }
                    done();
                },
                cookie);
        });

        it('Purchases count stats with four asset numbers: month granularity', function(done) {
            var query = {
                assets: [2,3,4,7],
                metric: "count"
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
                        dateof: ["2013-04-30T22:00:00.000Z", "2013-05-31T22:00:00.000Z", "2013-06-30T22:00:00.000Z"],
                        asset2: [0, 1, 0],
                        asset3: [3, 1, 1],
                        asset4: [2, 0, 0],
                        asset7: [0, 0, 0]
                    }

                    res.body.stats.length.should.equal(3)
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

        //different Granularity: DAY
        it('Points stats without asset numbers: day granularity', function(done){
            var query = {
                metric: "points",
                granularity: "day"
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
                        dateof: ["2013-05-24T22:00:00.000Z", "2013-05-25T22:00:00.000Z", "2013-06-01T22:00:00.000Z", "2013-06-09T22:00:00.000Z", "2013-07-01T22:00:00.000Z"],
                        total: [180, 1425, 280, 190, 280],
                    }

                    res.body.stats.length.should.equal(5)
                    for (var i in res.body.stats) {
                        var stats = res.body.stats[i];

                        stats.dateof.should.be.eql(expected.dateof[i]);
                        stats.total.should.be.eql(expected.total[i]);
                    }

                    done();
                },
                cookie);
        });

        it('Points stats with four asset numbers: day granularity', function(done) {
            var query = {
                assets: [2,3,4,7],
                metric: "points",
                granularity: "day"
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
                        dateof: ["2013-05-24T22:00:00.000Z", "2013-05-25T22:00:00.000Z", "2013-06-01T22:00:00.000Z", "2013-06-09T22:00:00.000Z", "2013-07-01T22:00:00.000Z"],
                        asset2: [0, 0, 0, 190, 0],
                        asset3: [0, 1425, 280, 0, 280],
                        asset4: [180, 0, 0, 0, 0],
                        asset7: [0, 0, 0, 0, 0]
                    }

                    res.body.stats.length.should.equal(5)
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
        
        it('Downloads stats without asset numbers: day granularity', function(done){
            var query = {
                metric: "downloads",
                granularity: "day"
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
                        dateof: ["2013-05-24T22:00:00.000Z", "2013-05-25T22:00:00.000Z", "2013-05-26T22:00:00.000Z", "2013-05-28T22:00:00.000Z", "2013-06-01T22:00:00.000Z", "2013-06-09T22:00:00.000Z", "2013-06-11T22:00:00.000Z", "2013-07-01T22:00:00.000Z", "2013-07-22T22:00:00.000Z", "2013-09-29T22:00:00.000Z", "2013-09-30T22:00:00.000Z"], 
                        total: [2, 4, 1, 1, 1, 1, 1, 1, 1, 1, 1]
                    }

                    res.body.stats.length.should.equal(11)
                    for (var i in res.body.stats) {
                        var stats = res.body.stats[i];

                        stats.dateof.should.be.eql(expected.dateof[i]);
                        stats.total.should.be.eql(expected.total[i]);
                    }

                    done();
                },
                cookie);
        });

        it('Downloads stats with four asset numbers: day granularity', function(done) {
            var query = {
                assets: [2,3,4,7],
                metric: "downloads",
                granularity: "day"
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
                        dateof: ["2013-05-24T22:00:00.000Z", "2013-05-25T22:00:00.000Z", "2013-05-26T22:00:00.000Z", "2013-05-28T22:00:00.000Z", "2013-06-01T22:00:00.000Z", "2013-06-09T22:00:00.000Z", "2013-06-11T22:00:00.000Z", "2013-07-01T22:00:00.000Z", "2013-07-22T22:00:00.000Z", "2013-09-29T22:00:00.000Z", "2013-09-30T22:00:00.000Z"],
                        asset2: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
                        asset3: [0, 4, 1, 1, 1, 0, 0, 1, 1, 1, 0], 
                        asset4: [2, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0], 
                        asset7: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
                    }

                    res.body.stats.length.should.equal(11)
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
        
        it('Purchases count stats without asset numbers: day granularity', function(done){
            var query = {
                metric: "count",
                granularity: "day"
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
                        dateof: ["2013-05-24T22:00:00.000Z", "2013-05-25T22:00:00.000Z", "2013-06-01T22:00:00.000Z", "2013-06-09T22:00:00.000Z", "2013-07-01T22:00:00.000Z"], 
                        total: [2, 3, 1, 1, 1]
                    }

                    res.body.stats.length.should.equal(5)
                    for (var i in res.body.stats) {
                        var stats = res.body.stats[i];

                        stats.dateof.should.be.eql(expected.dateof[i]);
                        stats.total.should.be.eql(expected.total[i]);
                    }

                    done();
                },
                cookie);
        });

        it('Purchases count stats with four asset numbers: day granularity', function(done) {
            var query = {
                assets: [2,3,4,7],
                metric: "count",
                granularity: "day"
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
                        dateof: ["2013-05-24T22:00:00.000Z", "2013-05-25T22:00:00.000Z", "2013-06-01T22:00:00.000Z", "2013-06-09T22:00:00.000Z", "2013-07-01T22:00:00.000Z"],
                        asset2: [0, 0, 0, 1, 0],
                        asset3: [0, 3, 1, 0, 1], 
                        asset4: [2, 0, 0, 0, 0], 
                        asset7: [0, 0, 0, 0, 0]
                    }

                    res.body.stats.length.should.equal(5)
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
        
        //different Granularity: YEAR
        it('Points stats without asset numbers: year granularity', function(done){
            var query = {
                metric: "points",
                granularity: "year"
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
                        dateof: ["2012-12-31T23:00:00.000Z"],
                        total: [2355],
                    }

                    res.body.stats.length.should.equal(1)
                    for (var i in res.body.stats) {
                        var stats = res.body.stats[i];

                        stats.dateof.should.be.eql(expected.dateof[i]);
                        stats.total.should.be.eql(expected.total[i]);
                    }

                    done();
                },
                cookie);
        });

        it('Points stats with four asset numbers: year granularity', function(done) {
            var query = {
                assets: [2,3,4,7],
                metric: "points",
                granularity: "year"
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
                        dateof: ["2012-12-31T23:00:00.000Z"],
                        asset2: [190],
                        asset3: [1985],
                        asset4: [180],
                        asset7: [0]
                    }

                    res.body.stats.length.should.equal(1)
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
        
        it('Downloads stats without asset numbers: year granularity', function(done){
            var query = {
                metric: "downloads",
                granularity: "year"
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
                        dateof: ["2012-12-31T23:00:00.000Z"],
                        total: [15],
                    }

                    res.body.stats.length.should.equal(1)
                    for (var i in res.body.stats) {
                        var stats = res.body.stats[i];

                        stats.dateof.should.be.eql(expected.dateof[i]);
                        stats.total.should.be.eql(expected.total[i]);
                    }

                    done();
                },
                cookie);
        });

        it('Downloads stats with four asset numbers: year granularity', function(done) {
            var query = {
                assets: [2,3,4,7],
                metric: "downloads",
                granularity: "year"
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
                        dateof: ["2012-12-31T23:00:00.000Z"],
                        asset2: [2],
                        asset3: [10],
                        asset4: [3],
                        asset7: [0]
                    }

                    res.body.stats.length.should.equal(1)
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
        
        it('Purchases count stats without asset numbers: year granularity', function(done){
            var query = {
                metric: "count",
                granularity: "year"
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
                        dateof: ["2012-12-31T23:00:00.000Z"],
                        total: [8],
                    }

                    res.body.stats.length.should.equal(1)
                    for (var i in res.body.stats) {
                        var stats = res.body.stats[i];

                        stats.dateof.should.be.eql(expected.dateof[i]);
                        stats.total.should.be.eql(expected.total[i]);
                    }

                    done();
                },
                cookie);
        });

        it('Purchases count stats with four asset numbers: year granularity', function(done) {
            var query = {
                assets: [2,3,4,7],
                metric: "count",
                granularity: "year"
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
                        dateof: ["2012-12-31T23:00:00.000Z"],
                        asset2: [1],
                        asset3: [5],
                        asset4: [2],
                        asset7: [0]
                    }

                    res.body.stats.length.should.equal(1)
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
