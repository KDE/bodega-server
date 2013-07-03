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

module.exports.listAttributes = function(db, req, res) {
    /*jshint multistr:true */
    var queryString =
    'SELECT name, lowdesc, highdesc, assettype FROM ratingattributes ra \
    INNER JOIN assettags at ON (ra.assettype = at.tag) \
    WHERE at.asset = $1 LIMIT $2 OFFSET $3;';

    var defaultPageSize = 25;
    var pageSize = parseInt(req.query.pageSize, 10) || defaultPageSize;
    var offset = parseInt(req.query.offset, 10) || 0;
    var assetId = req.params.assetId;
    var json = utils.standardJson(req);

    if (!assetId) {
        //Id of the asset is missing.
        errors.report('MissingParameters', req, res);
        return;
    }

    db.query(
        queryString, [assetId, pageSize + 1, offset],
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }

            if (result.rows.length > pageSize) {
                json.hasMoreRatingAttributes = true;
                result.rows.pop();
            }
            var ok = result.rows.length > 0 ? true : false;
            var json = utils.standardJson(req, ok);

            json.ratingAttributes = result.rows;
            res.json(json);
        });
};

module.exports.asset = function(db, req, res) {
    /*jshint multistr:true */
    var assetQuery = 'SELECT id FROM assets WHERE id = $1';

    var ratingsQuery = 'SELECT attribute, person, rating \
                        FROM ratings WHERE asset = $1 \
                        ORDER BY ratings.person LIMIT $2 OFFSET $3;';

    var defaultPageSize = 25;
    var pageSize = parseInt(req.query.pageSize, 10) || defaultPageSize;
    var offset = parseInt(req.query.offset, 10) || 0;
    var assetId = req.params.assetId;

    var json = utils.standardJson(req);

    if (!assetId) {
        //Id of the collection is missing.
        errors.report('MissingParameters', req, res);
        return;
    }

    json.hasMoreRatings = false;
    json.ratings = [];
    db.query(
        assetQuery, [assetId],
        function(err, result) {
            if (err)  {
                errors.report('Database', req, res, err);
                return;
            }

            if (result.rows.length < 1) {
                errors.report('NoMatch', req, res);
                return;
            }

        db.query(
            ratingsQuery, [assetId, pageSize + 1, offset],
            function(err, result) {
                if (err) {
                    errors.report('Database', req, res);
                    return;
                }

                if (result.rows.length > pageSize) {
                    json.hasMoreRatings = true;
                    result.rows.pop();
                }
                //TODO do we want to export the assetRatingsAverage data?????
                json.ratings = result.rows;
                res.json(json);
            });
    });
};

module.exports.participant = function(db, req, res) {
    /*jshint multistr:true */
    var personQuery = 'SELECT firstname, lastname, \
                      CASE WHEN people.middlenames IS NULL THEN \'\' \
                      ELSE people.middlenames END AS middlenames, \
                      fullname,\
                      email, points, earnedpoints, owedpoints, active \
                      FROM people \
                      WHERE people.id = $1;';

    var ratingsQuery = 'SELECT r.id, r.description, r.value \
                        FROM ratings r \
                        INNER JOIN  ratingscontent rc ON(rc.rating = r.id) \
                        INNER JOIN people ON(people.id = $1 AND rc.person = people.id) \
                        ORDER BY r.id LIMIT $2 OFFSET $3;';

    var defaultPageSize = 25;
    var pageSize = parseInt(req.query.pageSize, 10) || defaultPageSize;
    var offset = parseInt(req.query.offset, 10) || 0;

    var json = utils.standardJson(req);

    db.query(
        personQuery, [req.session.user.id],
        function(err, result) {
            if (err || !result.rows || !result.rows.length) {
                errors.report('Database', req, res, err);
                return;
            }

            json.person = result.rows[0];

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
    });
};

module.exports.addAsset = function(db, req, res) {
    /*jshint multistr:true */
    var assetInsertQuery =
        'INSERT INTO ratings (asset, attribute, person, rating) VALUES ($1, $2, $3);';

    var userId = req.query.user.id;
    var assetId = req.params.assetId;
    var attributeId = req.query.attributeId;
    var rating = req.query.rating;

    var json = utils.standardJson(req);

    if (!userId) {
        errors.report('MissingParameters', req, res);
        return;
    }
    if (!assetId) {
        errors.report('MissingParameters', req, res);
        return;
    }

    if (!rating) {
        errors.report('NoMatch', req, res);
        return;
    }
    if (!attributeId) {
        errors.report('MissingParameters', req, res);
        return;
    }

    db.query(
        assetInsertQuery, [assetId, attributeId, req.session.user.id, rating],
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }
//            json.rating = {
  //              attribute
    //        };

            res.json(json);
    });
};

module.exports.removeAsset = function(db, req, res) {
    /*jshint multistr:true */
    var assetQuery =
        'SELECT r.asset FROM ratings r WHERE asset = $1;';
    var assetDeleteQuery =
        'DELETE FROM ratings WHERE asset = $1 AND person = $2;';
    var userId = req.session.user.id;
    var assetId = req.params.assetId;

    var json = utils.standardJson(req);

    if (!userId) {
        errors.report('MissingParameters', req, res);
        return;
    }
    if (!assetId) {
        errors.report('MissingParameters', req, res);
        return;
    }

    db.query(
        assetQuery, [assetId],
        function(err, result) {
            if (err || !result.rows) {
                errors.report('Database', req, res, err);
                return;
            }
            if (!result.rows.length) {
                errors.report('NoMatch', req, res);
                return;
            }

            db.query(
                assetDeleteQuery, [assetId, userId],
                    function(err, result) {
                        if (err) {
                            errors.report('Database', req, res, err);
                            return;
                        }
                        res.json(json);
            });
        });
};

