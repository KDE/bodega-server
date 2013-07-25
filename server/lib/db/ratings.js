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
    'SELECT name, lowdesc, highdesc, assettype FROM ratingattributes ra \
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
    var ratingsQuery = 'SELECT attribute, person, rating \
                        FROM ratings WHERE asset = $1 \
                        ORDER BY ratings.person LIMIT $2 OFFSET $3;';

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

            //TODO do we want to export the assetRatingsAverage data?????
            json.ratings = result.rows;
            res.json(json);
    });
};

module.exports.participant = function(db, req, res) {
    /*jshint multistr:true */
    var ratingsQuery = 'SELECT r.asset, r.attribute, r.rating \
                        FROM ratings r WHERE r.person = $1 \
                        ORDER BY r.asset LIMIT $2 OFFSET $3;';

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

module.exports.addAsset = function(db, req, res) {
    /*jshint multistr:true */
    var assetInsertQuery =
        'INSERT INTO ratings (asset, attribute, person, rating) VALUES ($1, $2, $3, $4);';
    var ratingsDeleteQuery = 'DELETE FROM ratings WHERE asset = $1 AND person = $2 AND attribute = $3';

    // we don't have to check if the tag has assetType as tagtype, trg_ct_checkTagForRating
    // does the job for as.
    var checkAttributeQuery = 'SELECT ct_checkAssociationOfRatingAttributeWithAsset($1, $2) AS ok';

    var userId = req.session.user.id;
    var assetId = req.params.assetId;
    var ratings = req.body.ratings;

    var json = utils.standardJson(req);

    if (!assetId || !ratings) {
        errors.report('MissingParameters', req, res);
        return;
    }

    json.ratings = [];

    var queue = async.queue(function(rating, cb) {
        rating.rating = utils.parseNumber(rating.rating);
        rating.attribute= utils.parseNumber(rating.attribute);
        db.query (
            checkAttributeQuery, [assetId, rating.attribute],
            function(err, result) {
                if (err) {
                    errors.report('Database', req, res);
                    cb();
                    return;
                }

                if (json.ratings.indexOf(rating) === -1 && result.rows[0].ok) {
                    json.ratings.push(rating);

                    db.query(
                        ratingsDeleteQuery, [assetId, userId, rating.attribute],
                        function(err, result) {
                            if (err) {
                                errors.report('Database', req, res, err);
                                cb();
                                return;
                            }

                            db.query(
                                assetInsertQuery, [assetId, rating.attribute, userId, rating.rating],
                                function(err, result) {
                                if (err) {
                                    errors.report('Database', req, res, err);
                                    cb();
                                    return;
                                }
                                cb();
                        });
                });
            }
        });
    });

    queue.drain = function() {
        res.json(json);
    }

    queue.push(ratings);
};

module.exports.removeAsset = function(db, req, res) {
    /*jshint multistr:true */
    var assetDeleteQuery =
        'DELETE FROM ratings WHERE asset = $1 AND person = $2;';
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

