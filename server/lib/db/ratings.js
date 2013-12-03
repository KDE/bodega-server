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

var utils = require('../utils.js');
var errors = require('../errors.js');
var async = require('async');

module.exports.listAttributes = function(db, req, res) {
    /*jshint multistr:true */
    var queryString =
    'SELECT id, name, lowdesc, highdesc, assettype FROM assetRatingAttributes ra \
    LEFT JOIN assettags at ON (ra.assettype = at.tag) WHERE at.asset = $1;';

    var assetId = req.params.assetId;

    if (!assetId) {
        //Id of the asset is missing.
        errors.report('MissingParameters', req, res);
        return;
    }

    db.query(
        queryString, [assetId],
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }

            var ok = result.rows.length > 0 ? true : false;
            var json = utils.standardJson(req, ok);

            json.ratingAttributes = result.rows;
            res.json(json);
        });
};

module.exports.asset = function(db, req, res) {
    /*jshint multistr:true */
    var ratingsQuery = 'SELECT ar.attribute, attr.name as attributename, ar.person, p.fullname, \
                        ar.rating, extract(epoch from ar.created) as created \
                        FROM assetRatings ar \
                             JOIN assetRatingAttributes attr ON (ar.attribute = attr.id) \
                             LEFT JOIN people p ON (ar.person = p.id) \
                        WHERE ar.asset = $1 \
                        ORDER BY ar.created desc, p.fullname LIMIT $2 OFFSET $3;';

    var defaultPageSize = 25;
    var pageSize = utils.parseNumber(req.query.pageSize) || defaultPageSize;
    var offset = utils.parseNumber(req.query.offset) || 0;
    var assetId = req.params.assetId;

    if (!assetId) {
        //Id of the collection is missing.
        errors.report('MissingParameters', req, res);
        return;
    }

    var json = utils.standardJson(req);

    json.hasMoreRatings = false;
    json.ratings = [];

    db.query(
        ratingsQuery, [assetId, pageSize + 1, offset],
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }

            if (result.rowsCount > pageSize) {
                json.hasMoreRatings = true;
                result.rows.pop();
            }

            json.ratings = [];

            // now we're going to batch up the results nicely into an array of people objects
            var currentPerson;
            var person = null;
            for (var i = 0; i < result.rowCount; ++i) {
                var row = result.rows[i];
                if (currentPerson !== row.person) {
                    if (i > 0) {
                        // add the person to the ratings
                        json.ratings.push(person);
                    }

                    currentPerson = row.person;
                    person = {
                        person: row.person,
                        name: row.fullname,
                        rated: row.created,
                        ratings: []
                    };
                }

                person.ratings.push({attribute: row.attribute, name: row.attributename, rating: row.rating });
            }

            if (person) {
                json.ratings.push(person);
            }

            res.json(json);
    });
};

module.exports.participant = function(db, req, res) {
    // this query gets the first N *assets* and all their ratings, sorted by most recent
    // in case two assets were rated at the same time, they are sorted (for stability) by asset id
    // in case a rating was edited (causing 1 asset to have multiple rating dates) the sorting is done by
    // the most recent edit
    /*jshint multistr:true */
    var ratingsQuery = 'SELECT a.name as assetname, a.version, a.description,\
                               r.asset as assetId, r.attribute, ara.name as attributename,\
                               r.rating, extract(epoch from r.created) as created\
                        FROM assetRatings r JOIN\
                           assetRatingAttributes ara ON (r.attribute = ara.id) JOIN\
                           assets a ON (r.asset = a.id) JOIN\
                           (SELECT asset, max(at.created) AS created FROM assetratings at WHERE person = $1\
                            GROUP BY asset ORDER BY created desc, asset  LIMIT $2 OFFSET $3) AS assets on (r.asset = assets.asset)\
                        WHERE person = $1 ORDER BY r.created desc, r.asset, r.attribute;';

    var defaultPageSize = 25;
    var pageSize = utils.parseNumber(req.query.pageSize) || defaultPageSize;
    var offset = utils.parseNumber(req.query.offset) || 0;

    var json = utils.standardJson(req);

    json.ratings = [];
    db.query(
        ratingsQuery, [req.session.user.id, pageSize + 1, offset],
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }

            if (result.rowsCount > pageSize) {
                json.hasMoreRatings = true;
                result.rows.pop();
            }

            json.ratings = [];

            // now we're going to batch up the results nicely into an array of asset objects
            var currentAsset;
            var asset = null;
            for (var i = 0; i < result.rowCount; ++i) {
                var row = result.rows[i];
                if (currentAsset !== row.assetid) {
                    if (i > 0) {
                        // add the asset to the ratings
                        json.ratings.push(asset);
                    }

                    currentAsset = row.assetid;
                    asset = {
                        asset: row.assetid,
                        name: row.assetname,
                        version: row.version,
                        description: row.description,
                        rated: row.created,
                        ratings: []
                    };
                }

                asset.ratings.push({attribute: row.attribute, name: row.attributename, rating: row.rating });
            }

            if (asset) {
                json.ratings.push(asset);
            }
            res.json(json);
    });
};

module.exports.assetParticipantRatings = function(db, req, res) {
    /*jshint multistr:true */
    var ratingsQuery = 'SELECT attribute, rating FROM assetratings WHERE asset = $1 AND person = $2;';

    var assetId = utils.parseNumber(req.params.assetId);
    if (assetId < 0) {
        errors.report('MissingParameters', req, res);
        return;
    }

    db.query(
        ratingsQuery, [assetId, req.session.user.id],
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }

            var json = utils.standardJson(req);
            json.ratings = {};
            for (var i = 0; i < result.rowCount; ++i) {
                json.ratings[result.rows[i].attribute] = result.rows[i].rating;
            }
            res.json(json);
    });
};

module.exports.createAssetRating = function(db, req, res) {
    var assetId = utils.parseNumber(req.params.assetId);

    if (assetId < 1) {
        errors.report('MissingParameters', req, res);
        return;
    }

    // pg doesn't understand javascript object,
    // so we have to make it a pg array
    // a correct array in pg should be something
    // like { {1, 2 }, {2 ,3 } }
    var ratings = req.body.ratings ?
                        (typeof req.body.ratings === 'string' ? JSON.parse(req.body.ratings) : req.body.ratings) :
                        {};
    var temp = [];
    for (var i in ratings) {
        var attr = utils.parseNumber(i);
        var rating = utils.parseNumber(ratings[i], -1);
        if (attr > 0 && rating > -1) {
            temp.push('{' + attr + ', ' + rating + '}');
        }
    }

    if (temp.length < 1) {
        errors.report('MissingParameters', req, res);
        return;
    }

    var pgArray = '{' + temp.join(',') +  '}';

    db.query("SELECT ct_addAssetRating($1, $2, $3)",
            [req.session.user.id, assetId, pgArray],
            function(err, result) {
                if (err) {
                    if (err.code === 'CTR01') {
                        errors.report('RatingAttributeInvalid', req, res, err);
                    } else {
                        errors.report('Database', req, res, err);
                    }

                    return;
                }
                res.json(utils.standardJson(req));
            });
};

module.exports.removeAssetRating = function(db, req, res) {
    /*jshint multistr:true */
    var assetDeleteQuery =
        'DELETE FROM assetRatings WHERE asset = $1 AND person = $2;';
    var userId = req.session.user.id;
    var assetId = utils.parseNumber(req.params.assetId);

    if (assetId < 0) {
        errors.report('MissingParameters', req, res);
        return;
    }

    var json = utils.standardJson(req);

    db.query(
        assetDeleteQuery, [assetId, userId],
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }
            res.json(json);
        });
};

