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
    var ratingsQuery = 'SELECT attribute, person, rating, extract(epoch from created) \
                        FROM assetRatings WHERE asset = $1 \
                        ORDER BY created desc, person LIMIT $2 OFFSET $3;';

    var defaultPageSize = 25;
    var pageSize = parseInt(req.query.pageSize, 10) || defaultPageSize;
    var offset = parseInt(req.query.offset, 10) || 0;
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

            json.ratings = result.rows;
            res.json(json);
    });
};

module.exports.participant = function(db, req, res) {
    /*jshint multistr:true */
    var ratingsQuery = 'SELECT r.asset, r.attribute, r.rating, extract(epoch from created) \
                        FROM assetRatings r WHERE r.person = $1 \
                        ORDER BY r.created desc, r.asset LIMIT $2 OFFSET $3;';

    var defaultPageSize = 25;
    var pageSize = parseInt(req.query.pageSize, 10) || defaultPageSize;
    var offset = parseInt(req.query.offset, 10) || 0;

    var json = utils.standardJson(req);

    json.ratings = [];
    db.query(
        ratingsQuery, [req.session.user.id, pageSize + 1, offset],
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }

            if (result.rows.length > pageSize) {
                json.hasMoreRatings = true;
                result.rows.pop();
            }
            json.ratings = result.rows;
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
            json.ratings = result.rows;
            res.json(json);
    });
};

module.exports.addAssetRating = function(db, req, res) {
    /*jshint multistr:true */
    var assetInsertQuery =
        'SELECT ct_AddAssetRating($1, $2, $3)';

    var userId = req.session.user.id;
    var assetId = req.params.assetId;
    var ratings = req.body.ratings;

    if (!assetId || !ratings || ratings.length < 1) {
        errors.report('MissingParameters', req, res);
        return;
    }

    var json = utils.standardJson(req);
    json.ratings = [];

    // pg doesn't understand javascript object,
    // so we have to make it a pg array
    // a correct array in pg should be something
    // like { {1, 2 }, {2 ,3 } }
    var jsToPgArray = '';
    for (var i in ratings) {
        var rating = ratings[i];
        rating.rating = utils.parseNumber(rating.rating);
        rating.attribute = utils.parseNumber(rating.attribute);

        if (json.ratings.indexOf(rating) === -1) {
            json.ratings.push(rating);
            if (jsToPgArray === '') {
                jsToPgArray = '{ ';
            } else {
                jsToPgArray = jsToPgArray.concat(', ');
            }
            jsToPgArray = jsToPgArray.concat('{', rating.rating, ', ', rating.attribute, '}');
        }
    }
    //close the array
    jsToPgArray = jsToPgArray.concat(' }');

    db.query(
        assetInsertQuery, [userId, assetId, jsToPgArray],
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }
            res.json(json);
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

