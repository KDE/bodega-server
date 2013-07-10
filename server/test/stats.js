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

var pg = require('pg');
var utils = require('./support/http');
var querystring = require('querystring');

describe('Database environment for accurate statistics', function() {
        it('timezone set to UTC in postgresql.conf or db session', function(done) {
             pg.connect(utils.dbConnectionString, function(err, client, finis) {
                 client.query("SHOW time zone;", [],
                     function(err, result) {
                         result.rows[0].TimeZone.should.eql('UTC');
                         finis();
                         done();
                     });
             });
        });

    utils.auth(server);
});


describe('Asset statistics', function(){
    //Granularity: MONTH
    it('Points stats without asset numbers: month granularity', function(done){
        //not setting metrics there, assumes that without it goes to points by default
        var query = {
            from: "2013-05-01",
            to: "2013-07-01"
        };
        utils.getUrl('stats/assets/points?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');

                var expected = {
                    dateof: ["2013-05-01T00:00:00.000Z", "2013-06-01T00:00:00.000Z", "2013-07-01T00:00:00.000Z" ],
                    total: [3030, 940, 280]
                };

                res.body.stats.length.should.equal(3);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];

                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats.total.should.be.eql(expected.total[i]);
                }

                done();
            },
            utils.cookie);
    });

    it('Points stats with one asset number: month granularity', function(done) {
        var query = {
            assets: [3],
            from: "2013-05-01",
            to: "2013-07-01"
        };
        utils.getUrl('stats/assets/points?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');

                var expected = {
                    dateof: ["2013-05-01T00:00:00.000Z", "2013-06-01T00:00:00.000Z", "2013-07-01T00:00:00.000Z" ],
                    3: [1425, 280, 280]
                };

                res.body.stats.length.should.equal(3);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];

                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats.Dice.should.be.eql(expected[3][i]);
                }

                done();
            },
            utils.cookie);
    });

    it('Points stats with four asset numbers: month granularity', function(done) {
        var query = {
            assets: [2,3,4,7],
            from: "2013-05-01",
            to: "2013-07-01"
        };
        utils.getUrl('stats/assets/points?'+querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');
                var expected = {
                    dateof: ["2013-05-01T00:00:00.000Z", "2013-06-01T00:00:00.000Z", "2013-07-01T00:00:00.000Z" ],
                    2: [0, 190, 0],
                    3: [1425, 280, 280],
                    4: [180, 280, 0],
                    7: [0, 0, 0]
                };

                res.body.stats.length.should.equal(3);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];

                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats.Aquarium.should.be.eql(expected[2][i]);
                    stats.Dice.should.be.eql(expected[3][i]);
                    stats["Diamond Juice"].should.be.eql(expected[4][i]);
                    stats.Jewels.should.be.eql(expected[7][i]);
                }
                done();
            },
            utils.cookie);
    });



    //Downloads
    it('Downloads stats without asset numbers: month granularity', function(done) {
        var query = {
            from: "2013-05-01",
            to: "2013-10-01"
        };
        utils.getUrl('stats/assets/downloads?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');
                var expected = {
                    dateof: ["2013-05-01T00:00:00.000Z", "2013-06-01T00:00:00.000Z", "2013-07-01T00:00:00.000Z", "2013-08-01T00:00:00.000Z", "2013-09-01T00:00:00.000Z", "2013-10-01T00:00:00.000Z"],
                    total: [11, 4, 3, 0, 2, 2]
                };

                res.body.stats.length.should.equal(6);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];
                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats.total.should.be.eql(expected.total[i]);
                }
                done();
            },
            utils.cookie);
    });

    it('Downloads stats with one asset numbers: month granularity', function(done) {
        var query = {
            assets: [3],
            from: "2013-05-01",
            to: "2013-09-01"
        };
        utils.getUrl('stats/assets/downloads?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');
                var expected = {
                    dateof: ["2013-05-01T00:00:00.000Z", "2013-06-01T00:00:00.000Z", "2013-07-01T00:00:00.000Z", "2013-08-01T00:00:00.000Z", "2013-09-01T00:00:00.000Z"],
                    3: [6, 1, 2, 0, 1]
                };

                res.body.stats.length.should.equal(5);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];

                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats.Dice.should.be.eql(expected[3][i]);
                }
                done();
            },
            utils.cookie);
    });

    it('Downloads stats with four asset numbers: month granularity', function(done) {
        var query = {
            assets: [2,3,4,7],
            from: "2013-05-01",
            to: "2013-09-01"
        };
        utils.getUrl('stats/assets/downloads?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');
                var expected = {
                    dateof: ["2013-05-01T00:00:00.000Z", "2013-06-01T00:00:00.000Z", "2013-07-01T00:00:00.000Z", "2013-08-01T00:00:00.000Z", "2013-09-01T00:00:00.000Z", "2013-10-01T00:00:00.000Z"],
                    2: [0, 1, 0, 0, 0],
                    3: [6, 1, 2, 0, 1],
                    4: [2, 2, 0, 0, 0],
                    7: [0, 0, 0, 0, 0]
                };

                res.body.stats.length.should.equal(5);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];
                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats.Aquarium.should.be.eql(expected[2][i]);
                    stats.Dice.should.be.eql(expected[3][i]);
                    stats["Diamond Juice"].should.be.eql(expected[4][i]);
                    stats.Jewels.should.be.eql(expected[7][i]);
                }
                done();
            },
            utils.cookie);
    });

    it('Purchases count stats without numbers', function(done) {
        var query = {
            from: "2013-05-01",
            to: "2013-07-01"
        };
        utils.getUrl('stats/assets/purchases?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');
                var expected = {
                    dateof: ["2013-05-01T00:00:00.000Z", "2013-06-01T00:00:00.000Z", "2013-07-01T00:00:00.000Z"],
                    total: [8, 4, 1]
                };

                res.body.stats.length.should.equal(3);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];
                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats.total.should.be.eql(expected.total[i]);
                }
                done();
            },
            utils.cookie);
    });

    it('Purchases count stats with four asset numbers: month granularity', function(done) {
        var query = {
            assets: [2,3,4,7],
            from: "2013-05-01",
            to: "2013-07-01"
        };
        utils.getUrl('stats/assets/count?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');
                var expected = {
                    dateof: ["2013-05-01T00:00:00.000Z", "2013-06-01T00:00:00.000Z", "2013-07-01T00:00:00.000Z"],
                    2: [0, 1, 0],
                    3: [3, 1, 1],
                    4: [2, 1, 0],
                    7: [0, 0, 0]
                };

                res.body.stats.length.should.equal(3);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];
                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats.Aquarium.should.be.eql(expected[2][i]);
                    stats.Dice.should.be.eql(expected[3][i]);
                    stats["Diamond Juice"].should.be.eql(expected[4][i]);
                    stats.Jewels.should.be.eql(expected[7][i]);
                }
                done();
            },
            utils.cookie);
    });

    //different Granularity: DAY
    it('Points stats without asset numbers: day granularity', function(done){
        var query = {
            granularity: "day",
            from: "2013-05-23",
            to: "2013-05-27"
        };
        utils.getUrl('stats/assets/points?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');

                var expected = {
                    dateof: ["2013-05-23T00:00:00.000Z", "2013-05-24T00:00:00.000Z", "2013-05-25T00:00:00.000Z", "2013-05-26T00:00:00.000Z", "2013-05-27T00:00:00.000Z"],
                    total: [0, 0, 180, 2850, 0]
                };

                res.body.stats.length.should.equal(5);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];

                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats.total.should.be.eql(expected.total[i]);
                }

                done();
            },
            utils.cookie);
    });

    it('Points stats with four asset numbers: day granularity', function(done) {
        var query = {
            assets: [2,3,4,7],
            granularity: "day",
            from: "2013-05-31",
            to: "2013-06-04"
        };
        utils.getUrl('stats/assets/points?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');
                var expected = {
                    dateof: ["2013-05-31T00:00:00.000Z", "2013-06-01T00:00:00.000Z", "2013-06-02T00:00:00.000Z", "2013-06-03T00:00:00.000Z", "2013-06-04T00:00:00.000Z"],
                    2: [0, 0, 0, 0, 0],
                    3: [0, 0, 280, 0, 0],
                    4: [0, 0, 280, 0, 0],
                    7: [0, 0, 0, 0, 0]
                };

                res.body.stats.length.should.equal(5);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];

                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats.Aquarium.should.be.eql(expected[2][i]);
                    stats.Dice.should.be.eql(expected[3][i]);
                    stats["Diamond Juice"].should.be.eql(expected[4][i]);
                    stats.Jewels.should.be.eql(expected[7][i]);
                }
                done();
            },
            utils.cookie);
    });

    it('Downloads stats without asset numbers: day granularity', function(done){
        var query = {
            granularity: "day",
            from: "2013-05-24",
            to: "2013-06-03"
        };
        utils.getUrl('stats/assets/downloads?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');

                var expected = {
                    dateof: ["2013-05-24T00:00:00.000Z", "2013-05-25T00:00:00.000Z", "2013-05-26T00:00:00.000Z", "2013-05-27T00:00:00.000Z", "2013-05-28T00:00:00.000Z", "2013-05-29T00:00:00.000Z", "2013-05-30T00:00:00.000Z", "2013-05-31T00:00:00.000Z", "2013-06-01T00:00:00.000Z", "2013-06-02T00:00:00.000Z", "2013-06-03T00:00:00.000Z"],
                    total: [0, 2, 5, 2, 0, 2, 0, 0, 0, 1, 0]
                };

                res.body.stats.length.should.equal(11);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];

                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats.total.should.be.eql(expected.total[i]);
                }

                done();
            },
            utils.cookie);
    });

    it('Downloads stats with four asset numbers: day granularity', function(done) {
        var query = {
            assets: [2,3,4,7],
            granularity: "day",
            from: "2013-05-24",
            to: "2013-06-03"
        };
        utils.getUrl('stats/assets/downloads?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');
                var expected = {
                    dateof: ["2013-05-24T00:00:00.000Z", "2013-05-25T00:00:00.000Z", "2013-05-26T00:00:00.000Z", "2013-05-27T00:00:00.000Z", "2013-05-28T00:00:00.000Z", "2013-05-29T00:00:00.000Z", "2013-05-30T00:00:00.000Z", "2013-05-31T00:00:00.000Z", "2013-06-01T00:00:00.000Z", "2013-06-02T00:00:00.000Z", "2013-06-03T00:00:00.000Z"],
                    2: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    3: [0, 0, 4, 1, 0, 1, 0, 0, 0, 1, 0],
                    4: [0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    7: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
                };

                res.body.stats.length.should.equal(11);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];

                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats.Aquarium.should.be.eql(expected[2][i]);
                    stats.Dice.should.be.eql(expected[3][i]);
                    stats["Diamond Juice"].should.be.eql(expected[4][i]);
                    stats.Jewels.should.be.eql(expected[7][i]);
                }
                done();
            },
            utils.cookie);
    });

    it('Purchases count stats without asset numbers: day granularity', function(done){
        var query = {
            granularity: "day",
            from: "2013-05-24",
            to: "2013-06-03"
        };
        utils.getUrl('stats/assets/purchases?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');

                var expected = {
                    dateof: ["2013-05-24T00:00:00.000Z", "2013-05-25T00:00:00.000Z", "2013-05-26T00:00:00.000Z", "2013-05-27T00:00:00.000Z", "2013-05-28T00:00:00.000Z", "2013-05-29T00:00:00.000Z", "2013-05-30T00:00:00.000Z", "2013-05-31T00:00:00.000Z", "2013-06-01T00:00:00.000Z", "2013-06-02T00:00:00.000Z", "2013-06-03T00:00:00.000Z"],
                    total: [0, 2, 6, 0, 0, 0, 0, 0, 0, 2, 0]
                };

                res.body.stats.length.should.equal(11);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];

                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats.total.should.be.eql(expected.total[i]);
                }

                done();
            },
            utils.cookie);
    });

    it('Purchases count stats with four asset numbers: day granularity', function(done) {
        var query = {
            assets: [2,3,4,7],
            granularity: "day",
            from: "2013-05-24",
            to: "2013-06-03"
        };
        utils.getUrl('stats/assets/purchases?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');
                var expected = {
                    dateof: ["2013-05-24T00:00:00.000Z", "2013-05-25T00:00:00.000Z", "2013-05-26T00:00:00.000Z", "2013-05-27T00:00:00.000Z", "2013-05-28T00:00:00.000Z", "2013-05-29T00:00:00.000Z", "2013-05-30T00:00:00.000Z", "2013-05-31T00:00:00.000Z", "2013-06-01T00:00:00.000Z", "2013-06-02T00:00:00.000Z", "2013-06-03T00:00:00.000Z"],
                    2: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    3: [0, 0, 3, 0, 0, 0, 0, 0, 0, 1, 0],
                    4: [0, 2, 0, 0, 0, 0, 0, 0, 0, 1, 0],
                    7: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
                };

                res.body.stats.length.should.equal(11);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];

                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats.Aquarium.should.be.eql(expected[2][i]);
                    stats.Dice.should.be.eql(expected[3][i]);
                    stats["Diamond Juice"].should.be.eql(expected[4][i]);
                    stats.Jewels.should.be.eql(expected[7][i]);
                }
                done();
            },
            utils.cookie);
    });

    //different Granularity: YEAR
    it('Points stats without asset numbers: year granularity', function(done){
        var query = {
            granularity: "year",
            from: "2012-01-01",
            to: "2014-01-01"
        };
        utils.getUrl('stats/assets/points?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');

                var expected = {
                    dateof: ["2012-01-01T00:00:00.000Z", "2013-01-01T00:00:00.000Z", "2014-01-01T00:00:00.000Z"],
                    total: [0, 4250, 0]
                };

                res.body.stats.length.should.equal(3);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];

                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats.total.should.be.eql(expected.total[i]);
                }

                done();
            },
            utils.cookie);
    });

    it('Points stats with four asset numbers: year granularity', function(done) {
        var query = {
            assets: [2,3,4,7],
            granularity: "year",
            from: "2012-01-01",
            to: "2014-01-01"
        };
        utils.getUrl('stats/assets/points?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');
                var expected = {
                    dateof: ["2012-01-01T00:00:00.000Z", "2013-01-01T00:00:00.000Z", "2014-01-01T00:00:00.000Z"],
                    2: [0, 190, 0],
                    3: [0, 1985, 0],
                    4: [0, 460, 0],
                    7: [0, 0, 0]
                };

                res.body.stats.length.should.equal(3);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];

                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats.Aquarium.should.be.eql(expected[2][i]);
                    stats.Dice.should.be.eql(expected[3][i]);
                    stats["Diamond Juice"].should.be.eql(expected[4][i]);
                    stats.Jewels.should.be.eql(expected[7][i]);
                }
                done();
            },
            utils.cookie);
    });

    it('Downloads stats without asset numbers: year granularity', function(done){
        var query = {
            granularity: "year",
            from: "2012-01-01",
            to: "2014-01-01"
        };
        utils.getUrl('stats/assets/downloads?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');

                var expected = {
                    dateof: ["2012-01-01T00:00:00.000Z", "2013-01-01T00:00:00.000Z", "2014-01-01T00:00:00.000Z"],
                    total: [0, 22, 0]
                };

                res.body.stats.length.should.equal(3);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];

                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats.total.should.be.eql(expected.total[i]);
                }

                done();
            },
            utils.cookie);
    });

    it('Downloads stats with four asset numbers: year granularity', function(done) {
        var query = {
            assets: [2,3,4,7],
            granularity: "year",
            from: "2012-01-01",
            to: "2014-01-01"
        };
        utils.getUrl('stats/assets/downloads?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');
                var expected = {
                    dateof: ["2012-01-01T00:00:00.000Z", "2013-01-01T00:00:00.000Z", "2014-01-01T00:00:00.000Z"],
                    2: [0, 2, 0],
                    3: [0, 10, 0],
                    4: [0, 4, 0],
                    7: [0, 1, 0]
                };

                res.body.stats.length.should.equal(3);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];

                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats.Aquarium.should.be.eql(expected[2][i]);
                    stats.Dice.should.be.eql(expected[3][i]);
                    stats["Diamond Juice"].should.be.eql(expected[4][i]);
                    stats.Jewels.should.be.eql(expected[7][i]);
                }
                done();
            },
            utils.cookie);
    });

    it('Purchases count stats without asset numbers: year granularity', function(done){
        var query = {
            granularity: "year",
            from: "2012-01-01",
            to: "2014-01-01"
        };
        utils.getUrl('stats/assets/purchases?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');

                var expected = {
                    dateof: ["2012-01-01T00:00:00.000Z", "2013-01-01T00:00:00.000Z", "2014-01-01T00:00:00.000Z"],
                    total: [0, 13, 0]
                };

                res.body.stats.length.should.equal(3);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];

                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats.total.should.be.eql(expected.total[i]);
                }

                done();
            },
            utils.cookie);
    });

    it('Purchases count stats with four asset numbers: year granularity', function(done) {
        var query = {
            assets: [2,3,4,7],
            granularity: "year",
            from: "2012-01-01",
            to: "2014-01-01"
        };
        utils.getUrl('stats/assets/purchases?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');
                var expected = {
                    dateof: ["2012-01-01T00:00:00.000Z", "2013-01-01T00:00:00.000Z", "2014-01-01T00:00:00.000Z"],
                    2: [0, 1, 0],
                    3: [0, 5, 0],
                    4: [0, 3, 0],
                    7: [0, 0, 0]
                };

                res.body.stats.length.should.equal(3);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];

                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats.Aquarium.should.be.eql(expected[2][i]);
                    stats.Dice.should.be.eql(expected[3][i]);
                    stats["Diamond Juice"].should.be.eql(expected[4][i]);
                    stats.Jewels.should.be.eql(expected[7][i]);
                }
                done();
            },
            utils.cookie);
    });
});

describe('Store statistics', function(){
    it("Should not be able to peak at someone else's store's stats", function(done) {
        var query = {
            stores: ['VIVALDI-1'],
            from: "2013-05-01",
            to: "2013-07-01"
        };
        utils.getUrl('stats/stores/points?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');

                var expected = {
                    dateof: ["2013-05-01T00:00:00.000Z", "2013-06-01T00:00:00.000Z", "2013-07-01T00:00:00.000Z" ],
                    "VIVALDI-1": [0, 0, 0]
                };

                res.body.stats.length.should.equal(3);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];

                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats["VIVALDI-1"].should.be.eql(expected["VIVALDI-1"][i]);
                }

                done();
            },
            utils.cookie);
    });

    //Granularity: MONTH
    it('Points stats without store ids: month granularity', function(done){
        //not setting metrics there, assumes that without it goes to points by default
        var query = {
            from: "2013-05-01",
            to: "2013-07-01"
        };
        utils.getUrl('stats/stores/points?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');

                var expected = {
                    dateof: ["2013-05-01T00:00:00.000Z", "2013-06-01T00:00:00.000Z", "2013-07-01T00:00:00.000Z" ],
                    total: [70, 20, 0]
                };

                res.body.stats.length.should.equal(3);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];

                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats.total.should.be.eql(expected.total[i]);
                }

                done();
            },
            utils.cookie);
    });

    it('Points stats with one store id: month granularity', function(done) {
        var query = {
            stores: ['KDE-1'],
            from: "2013-05-01",
            to: "2013-07-01"
        };
        utils.getUrl('stats/stores/points?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');

                var expected = {
                    dateof: ["2013-05-01T00:00:00.000Z", "2013-06-01T00:00:00.000Z", "2013-07-01T00:00:00.000Z" ],
                    "KDE-1": [70, 20, 0]
                };

                res.body.stats.length.should.equal(3);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];

                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats["KDE-1"].should.be.eql(expected["KDE-1"][i]);
                }

                done();
            },
            utils.cookie);
    });

    it('Points stats with two store ids: month granularity', function(done) {
        var query = {
            stores: ['KDE-1', 'KDE-2'],
            from: "2013-05-01",
            to: "2013-07-01"
        };
        utils.getUrl('stats/stores/points?'+querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');
                var expected = {
                    dateof: ["2013-05-01T00:00:00.000Z", "2013-06-01T00:00:00.000Z", "2013-07-01T00:00:00.000Z" ],
                    'KDE-1': [70, 20, 0],
                    'KDE-2': [0, 0, 0]
                };

                res.body.stats.length.should.equal(3);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];

                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats["KDE-1"].should.be.eql(expected["KDE-1"][i]);
                    stats["KDE-2"].should.be.eql(expected["KDE-2"][i]);
                }
                done();
            },
            utils.cookie);
    });



    //Downloads
    it('Downloads stats without store ids: month granularity', function(done) {
        var query = {
            from: "2013-05-01",
            to: "2013-10-01"
        };
        utils.getUrl('stats/stores/downloads?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');
                var expected = {
                    dateof: ["2013-05-01T00:00:00.000Z", "2013-06-01T00:00:00.000Z", "2013-07-01T00:00:00.000Z", "2013-08-01T00:00:00.000Z", "2013-09-01T00:00:00.000Z", "2013-10-01T00:00:00.000Z"],
                    total: [3, 1, 1, 0, 1, 1]
                };

                res.body.stats.length.should.equal(6);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];
                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats.total.should.be.eql(expected.total[i]);
                }
                done();
            },
            utils.cookie);
    });

    it('Downloads stats with one store id: month granularity', function(done) {
        var query = {
            stores: ['KDE-1'],
            from: "2013-05-01",
            to: "2013-09-01"
        };
        utils.getUrl('stats/stores/downloads?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');
                var expected = {
                    dateof: ["2013-05-01T00:00:00.000Z", "2013-06-01T00:00:00.000Z", "2013-07-01T00:00:00.000Z", "2013-08-01T00:00:00.000Z", "2013-09-01T00:00:00.000Z"],
                    'KDE-1': [3, 1, 1, 0, 1]
                };

                res.body.stats.length.should.equal(5);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];

                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats["KDE-1"].should.be.eql(expected["KDE-1"][i]);
                }
                done();
            },
            utils.cookie);
    });

    it('Downloads stats with two store ids: month granularity', function(done) {
        var query = {
            stores: ['KDE-1', 'KDE-2'],
            from: "2013-05-01",
            to: "2013-09-01"
        };
        utils.getUrl('stats/stores/downloads?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');
                var expected = {
                    dateof: ["2013-05-01T00:00:00.000Z", "2013-06-01T00:00:00.000Z", "2013-07-01T00:00:00.000Z", "2013-08-01T00:00:00.000Z", "2013-09-01T00:00:00.000Z", "2013-10-01T00:00:00.000Z"],
                    'KDE-1': [3, 1, 1, 0, 1],
                    'KDE-2': [0, 0, 0, 0, 0]
                };

                res.body.stats.length.should.equal(5);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];
                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats["KDE-1"].should.be.eql(expected['KDE-1'][i]);
                    stats["KDE-2"].should.be.eql(expected['KDE-2'][i]);
                }
                done();
            },
            utils.cookie);
    });

    it('Purchases count stats without numbers', function(done) {
        var query = {
            from: "2013-05-01",
            to: "2013-07-01"
        };
        utils.getUrl('stats/stores/purchases?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');
                var expected = {
                    dateof: ["2013-05-01T00:00:00.000Z", "2013-06-01T00:00:00.000Z", "2013-07-01T00:00:00.000Z"],
                    total: [3, 2, 0]
                };

                res.body.stats.length.should.equal(3);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];
                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats.total.should.be.eql(expected.total[i]);
                }
                done();
            },
            utils.cookie);
    });

    it('Purchases count stats with two store ids: month granularity', function(done) {
        var query = {
            stores: ['KDE-1', 'KDE-2'],
            from: "2013-05-01",
            to: "2013-07-01"
        };
        utils.getUrl('stats/stores/count?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');
                var expected = {
                    dateof: ["2013-05-01T00:00:00.000Z", "2013-06-01T00:00:00.000Z", "2013-07-01T00:00:00.000Z"],
                    'KDE-1': [3, 2, 0],
                    'KDE-2': [0, 0, 0]
                };

                res.body.stats.length.should.equal(3);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];
                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats["KDE-1"].should.be.eql(expected['KDE-1'][i]);
                    stats["KDE-2"].should.be.eql(expected['KDE-2'][i]);
                }
                done();
            },
            utils.cookie);
    });

    //different Granularity: DAY
    it('Points stats without store ids: day granularity', function(done){
        var query = {
            granularity: "day",
            from: "2013-05-23",
            to: "2013-05-27"
        };
        utils.getUrl('stats/stores/points?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');

                var expected = {
                    dateof: ["2013-05-23T00:00:00.000Z", "2013-05-24T00:00:00.000Z", "2013-05-25T00:00:00.000Z", "2013-05-26T00:00:00.000Z", "2013-05-27T00:00:00.000Z"],
                    total: [0, 0, 0, 70, 0]
                };

                res.body.stats.length.should.equal(5);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];

                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats.total.should.be.eql(expected.total[i]);
                }

                done();
            },
            utils.cookie);
    });

    it('Points stats with two store ids: day granularity', function(done) {
        var query = {
            stores: ['KDE-1', 'KDE-2'],
            granularity: "day",
            from: "2013-05-31",
            to: "2013-06-04"
        };
        utils.getUrl('stats/stores/points?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');
                var expected = {
                    dateof: ["2013-05-31T00:00:00.000Z", "2013-06-01T00:00:00.000Z", "2013-06-02T00:00:00.000Z", "2013-06-03T00:00:00.000Z", "2013-06-04T00:00:00.000Z"],
                    'KDE-1': [0, 0, 15, 0, 0],
                    'KDE-2': [0, 0, 0, 0, 0]
                };

                res.body.stats.length.should.equal(5);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];

                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats["KDE-1"].should.be.eql(expected["KDE-1"][i]);
                    stats["KDE-2"].should.be.eql(expected["KDE-2"][i]);
                }
                done();
            },
            utils.cookie);
    });

    it('Downloads stats without store ids: day granularity', function(done){
        var query = {
            granularity: "day",
            from: "2013-05-24",
            to: "2013-06-03"
        };
        utils.getUrl('stats/stores/downloads?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');

                var expected = {
                    dateof: ["2013-05-24T00:00:00.000Z", "2013-05-25T00:00:00.000Z", "2013-05-26T00:00:00.000Z", "2013-05-27T00:00:00.000Z", "2013-05-28T00:00:00.000Z", "2013-05-29T00:00:00.000Z", "2013-05-30T00:00:00.000Z", "2013-05-31T00:00:00.000Z", "2013-06-01T00:00:00.000Z", "2013-06-02T00:00:00.000Z", "2013-06-03T00:00:00.000Z"],
                    total: [0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0]
                };

                res.body.stats.length.should.equal(11);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];

                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats.total.should.be.eql(expected.total[i]);
                }

                done();
            },
            utils.cookie);
    });

    it('Downloads stats with two store ids: day granularity', function(done) {
        var query = {
            stores: ['KDE-1', 'KDE-2'],
            granularity: "day",
            from: "2013-05-24",
            to: "2013-06-03"
        };
        utils.getUrl('stats/stores/downloads?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');
                var expected = {
                    dateof: ["2013-05-24T00:00:00.000Z", "2013-05-25T00:00:00.000Z", "2013-05-26T00:00:00.000Z", "2013-05-27T00:00:00.000Z", "2013-05-28T00:00:00.000Z", "2013-05-29T00:00:00.000Z", "2013-05-30T00:00:00.000Z", "2013-05-31T00:00:00.000Z", "2013-06-01T00:00:00.000Z", "2013-06-02T00:00:00.000Z", "2013-06-03T00:00:00.000Z"],
                    'KDE-1': [0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 0],
                    'KDE-2': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
                };

                res.body.stats.length.should.equal(11);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];

                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats["KDE-1"].should.be.eql(expected['KDE-1'][i]);
                    stats["KDE-2"].should.be.eql(expected['KDE-2'][i]);
                }
                done();
            },
            utils.cookie);
    });

    it('Purchases count stats without store ids: day granularity', function(done){
        var query = {
            granularity: "day",
            from: "2013-05-24",
            to: "2013-06-03"
        };
        utils.getUrl('stats/stores/purchases?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');

                var expected = {
                    dateof: ["2013-05-24T00:00:00.000Z", "2013-05-25T00:00:00.000Z", "2013-05-26T00:00:00.000Z", "2013-05-27T00:00:00.000Z", "2013-05-28T00:00:00.000Z", "2013-05-29T00:00:00.000Z", "2013-05-30T00:00:00.000Z", "2013-05-31T00:00:00.000Z", "2013-06-01T00:00:00.000Z", "2013-06-02T00:00:00.000Z", "2013-06-03T00:00:00.000Z"],
                    total: [0, 0, 3, 0, 0, 0, 0, 0, 0, 1, 0]
                };

                res.body.stats.length.should.equal(11);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];

                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats.total.should.be.eql(expected.total[i]);
                }

                done();
            },
            utils.cookie);
    });

    it('Purchases count stats with two store ids: day granularity', function(done) {
        var query = {
            stores: ['KDE-1', 'KDE-2'],
            granularity: "day",
            from: "2013-05-24",
            to: "2013-06-03"
        };
        utils.getUrl('stats/stores/purchases?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');
                var expected = {
                    dateof: ["2013-05-24T00:00:00.000Z", "2013-05-25T00:00:00.000Z", "2013-05-26T00:00:00.000Z", "2013-05-27T00:00:00.000Z", "2013-05-28T00:00:00.000Z", "2013-05-29T00:00:00.000Z", "2013-05-30T00:00:00.000Z", "2013-05-31T00:00:00.000Z", "2013-06-01T00:00:00.000Z", "2013-06-02T00:00:00.000Z", "2013-06-03T00:00:00.000Z"],
                    'KDE-1': [0, 0, 3, 0, 0, 0, 0, 0, 0, 1, 0],
                    'KDE-2': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
                };

                res.body.stats.length.should.equal(11);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];

                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats["KDE-1"].should.be.eql(expected['KDE-1'][i]);
                    stats["KDE-2"].should.be.eql(expected['KDE-2'][i]);
                }
                done();
            },
            utils.cookie);
    });

    //different Granularity: YEAR
    it('Points stats without store ids: year granularity', function(done){
        var query = {
            granularity: "year",
            from: "2012-01-01",
            to: "2014-01-01"
        };
        utils.getUrl('stats/stores/points?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');

                var expected = {
                    dateof: ["2012-01-01T00:00:00.000Z", "2013-01-01T00:00:00.000Z", "2014-01-01T00:00:00.000Z"],
                    total: [0, 90, 0]
                };

                res.body.stats.length.should.equal(3);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];

                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats.total.should.be.eql(expected.total[i]);
                }

                done();
            },
            utils.cookie);
    });

    it('Points stats with two store ids: year granularity', function(done) {
        var query = {
            stores: ['KDE-1', 'KDE-2'],
            granularity: "year",
            from: "2012-01-01",
            to: "2014-01-01"
        };
        utils.getUrl('stats/stores/points?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');
                var expected = {
                    dateof: ["2012-01-01T00:00:00.000Z", "2013-01-01T00:00:00.000Z", "2014-01-01T00:00:00.000Z"],
                    'KDE-1': [0, 90, 0],
                    'KDE-2': [0, 0, 0]
                };

                res.body.stats.length.should.equal(3);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];

                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats["KDE-1"].should.be.eql(expected['KDE-1'][i]);
                    stats["KDE-2"].should.be.eql(expected['KDE-2'][i]);
                }
                done();
            },
            utils.cookie);
    });

    it('Downloads stats without store ids: year granularity', function(done){
        var query = {
            granularity: "year",
            from: "2012-01-01",
            to: "2014-01-01"
        };
        utils.getUrl('stats/stores/downloads?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');

                var expected = {
                    dateof: ["2012-01-01T00:00:00.000Z", "2013-01-01T00:00:00.000Z", "2014-01-01T00:00:00.000Z"],
                    total: [0, 7, 0]
                };

                res.body.stats.length.should.equal(3);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];

                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats.total.should.be.eql(expected.total[i]);
                }

                done();
            },
            utils.cookie);
    });

    it('Downloads stats with two store ids: year granularity', function(done) {
        var query = {
            stores: ['KDE-1', 'KDE-2'],
            granularity: "year",
            from: "2012-01-01",
            to: "2014-01-01"
        };
        utils.getUrl('stats/stores/downloads?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');
                var expected = {
                    dateof: ["2012-01-01T00:00:00.000Z", "2013-01-01T00:00:00.000Z", "2014-01-01T00:00:00.000Z"],
                    'KDE-1': [0, 7, 0],
                    'KDE-2': [0, 0, 0]
                };

                res.body.stats.length.should.equal(3);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];

                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats["KDE-1"].should.be.eql(expected['KDE-1'][i]);
                    stats["KDE-2"].should.be.eql(expected['KDE-2'][i]);
                }
                done();
            },
            utils.cookie);
    });

    it('Purchases count stats without store ids: year granularity', function(done){
        var query = {
            granularity: "year",
            from: "2012-01-01",
            to: "2014-01-01"
        };
        utils.getUrl('stats/stores/purchases?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');

                var expected = {
                    dateof: ["2012-01-01T00:00:00.000Z", "2013-01-01T00:00:00.000Z", "2014-01-01T00:00:00.000Z"],
                    total: [0, 5, 0]
                };

                res.body.stats.length.should.equal(3);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];

                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats.total.should.be.eql(expected.total[i]);
                }

                done();
            },
            utils.cookie);
    });

    it('Purchases count stats with two store ids: year granularity', function(done) {
        var query = {
            stores: ['KDE-1', 'KDE-2'],
            granularity: "year",
            from: "2012-01-01",
            to: "2014-01-01"
        };
        utils.getUrl('stats/stores/purchases?' + querystring.stringify(query),
            function(res) {
                res.statusCode.should.equal(200);
                res.headers.should.have.property(
                    'content-type',
                    'application/json');
                res.body.should.have.property('authStatus', true);
                res.body.should.have.property('stats');
                var expected = {
                    dateof: ["2012-01-01T00:00:00.000Z", "2013-01-01T00:00:00.000Z", "2014-01-01T00:00:00.000Z"],
                    'KDE-1': [0, 5, 0],
                    'KDE-2': [0, 0, 0]
                };

                res.body.stats.length.should.equal(3);
                for (var i in res.body.stats) {
                    var stats = res.body.stats[i];

                    stats.dateof.should.be.eql(expected.dateof[i]);
                    stats["KDE-1"].should.be.eql(expected['KDE-1'][i]);
                    stats["KDE-2"].should.be.eql(expected['KDE-2'][i]);
                }
                done();
            },
            utils.cookie);
    });
});
