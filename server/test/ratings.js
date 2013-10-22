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
var utils = require('./support/utils');

describe('Ratings', function() {
    utils.auth();

    describe('List attributes', function() {
        it('should fail because the asset is invalid', function(done) {
            utils.getUrl('asset/ratings/attributes/1000',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', false);
                    res.body.should.have.property('ratingAttributes');
                    res.body.ratingAttributes.should.have.length(0);
                    done();
                });
        });
        it('should succeed', function(done) {
            utils.getUrl('asset/ratings/attributes/2',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', true);
                    res.body.should.have.property('ratingAttributes');
                    var ratingAttributes = res.body.ratingAttributes;
                    ratingAttributes.should.be.an.instanceOf(Array);
                    ratingAttributes.length.should.be.above(0);
                    done();
                });
        });
    });

    describe('List asset ratings', function() {
        it('should fail because the asset is invalid', function(done) {
            utils.getUrl('asset/ratings/list/1000',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', true);
                    done();
                });
        });
        it('should succeed', function(done) {
            utils.getUrl('asset/ratings/list/8',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', true);
                    var ratings = res.body.ratings;
                    ratings.should.be.an.instanceOf(Array);
                    ratings.should.have.length(2);
                    done();
                });
        });
        it('should be empty because there are no ratings for the asset', function(done) {
            utils.getUrl('asset/ratings/list/10',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', true);
                    var ratings = res.body.ratings;
                    ratings.should.be.an.instanceOf(Array);
                    ratings.should.have.length(0);
                    done();
                });
        });
    });

    describe('Ratings by participant', function() {
        it('should show Zack having 3 ratings', function(done) {
            var expected =
                [
                    {
                        "asset": 2,
                        "name": "Aquarium",
                        "version": "0.2",
                        "description": "Grow an aqarium full of fish!",
                        "rated": '',
                        "ratings": [
                            {
                                "attribute": 1,
                                "name": "Usability",
                                "rating": 1
                            }
                        ]
                    },
                    {
                        "asset": 8,
                        "name": "Poker1",
                        "version": "0.1",
                        "description": "Poker 1",
                        "rated": '',
                        "ratings": [
                            {
                                "attribute": 17,
                                "name": "Graphics",
                                "rating": 5
                            }
                        ]
                    },
                    {
                        "asset": 9,
                        "name": "Poker2",
                        "version": "0.2",
                        "description": "Poker 2",
                        "rated": '',
                        "ratings": [
                            {
                                "attribute": 20,
                                "name": "Enjoyability",
                                "rating": 3
                            }
                        ]
                    }
                ];
            utils.getUrl('participant/ratings',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', true);
                    var ratings = res.body.ratings;
                    ratings.should.be.an.instanceOf(Array);
                    ratings.should.have.length(3);
                    // the timestamp of the rating is set on creation,
                    // iow when `make test_data` is run. so we manually
                    // sync the timestamps as they are untestable
                    expected[0].rated = ratings[0].rated;
                    expected[1].rated = ratings[1].rated;
                    expected[2].rated = ratings[2].rated;
                    ratings.should.eql(expected);
                    done();
                });
        });

        it('should show user\'s ratings for specific asset', function(done) {
            var expected = { 1: 1 };
            utils.getUrl('participant/ratings/2',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', true);
                    res.body.ratings.should.eql(expected);
                    done();
                });
        });
    });

    describe('Add asset ratings', function() {
        it('should fail because the asset is invalid', function(done) {
            utils.app.config.printErrors = false;
            utils.postUrl('asset/ratings/create/1000', {},
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', false);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type', 'MissingParameters');
                    utils.app.config.printErrors = true;
                    done();
                });
        });

        it('should fail because the rating types do not fit the asset', function(done) {
            var ratings = { 10: 1, 12: 3, 18: 2 };
            var query = {
                ratings: JSON.stringify(ratings)
            };

            utils.app.config.printErrors = false;
            utils.postUrl('asset/ratings/create/10', query,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', false);
                    res.body.should.have.property('error');
                    res.body.error.should.have.property('type', 'RatingAttributeInvalid');
                    utils.app.config.printErrors = true;
                    done();
                });
        });

        it('should succeed', function(done) {
            var ratings = { 17: 1, 18: 3, 20: 2 };
            var query = {
                ratings: JSON.stringify(ratings)
            };

            utils.postUrl('asset/ratings/create/10', query,
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', true);
                    utils.getUrl('participant/ratings/10',
                        function(res) {
                            res.body.ratings.should.be.eql(ratings);
                            done();
                        });
                });
        });
    });

    describe('Remove asset ratings', function() {
        it('should fail because the asset is invalid', function(done) {
            utils.getUrl('asset/ratings/delete/1000',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    done();
                });
        });
        it('should succeed', function(done) {
            utils.getUrl('asset/ratings/delete/10',
                function(res) {
                    res.statusCode.should.equal(200);
                    res.headers.should.have.property('content-type');
                    res.body.should.have.property('authStatus', true);
                    res.body.should.have.property('success', true);
                    done();
                });
        });
    });
});

