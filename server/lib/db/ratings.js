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

module.exports.listAll = function(db, req, res) {
    /*jshint multistr:true */
    var queryString =
        'SELECT b.id, b.description, b.value, b.channelId \
         FROM ratings b ORDER BY b.id LIMIT $1 OFFSET $2;';
    var defaultPageSize = 25;
    var pageSize = parseInt(req.query.pageSize, 10) || defaultPageSize;
    var offset = parseInt(req.query.offset, 10) || 0;
    var json = utils.standardJson(req);

    db.query(
        queryString, [pageSize + 1, offset],
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

module.exports.asset = function(db, req, res) {
    /*jshint multistr:true */
    var assetQuery = 'SELECT DISTINCT a.id, a.license, partners.id as partnerId, \
                     partners.name AS partnername, a.version, a.path, a.image, a.name,\
                     CASE WHEN p.points IS NULL THEN 0 ELSE p.points END AS points \
                     FROM ratingsContent rc \
                     INNER JOIN assets a ON (rc.asset = $1 AND rc.asset = a.id)\
                     LEFT JOIN partners ON (a.author = partners.id) \
                     LEFT JOIN assetPrices p ON (p.asset = a.id AND p.device = $2) \
                     ORDER BY a.name LIMIT $3 OFFSET $4;';

    var ratingsQuery = 'SELECT id, description, value \
                        FROM ratings \
                        INNER JOIN  ratingscontent rc ON(rc.asset = $1 AND ratings.id = rc.rating) \
                        ORDER BY ratings.id LIMIT $2 OFFSET $3;';

    var defaultPageSize = 25;
    var pageSize = parseInt(req.query.pageSize, 10) || defaultPageSize;
    var offset = parseInt(req.query.offset, 10) || 0;
    var assetId = req.query.assetId;

    var json = utils.standardJson(req);

    if (!assetId) {
        //Id of the collection is missing.
        errors.report('MissingParameters', req, res);
        return;
    }

    db.query(
        assetQuery, [assetId, json.device, pageSize + 1, offset],
        function(err, result) {
            if (err || !result.rows || !result.rows.length) {
                errors.report('Database', req, res, err);
                return;
            }

            json.asset = result.rows[0];

            json.ratings = [];
            db.query(
                ratingsQuery, [assetId, pageSize + 1, offset],
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
    var ratingQuery =
        'SELECT b.id, b.description, b.value, b.channelId \
         FROM ratings b WHERE b.id = $1';
    var assetsQuery =
        'SELECT bc.asset FROM ratingsContent bc \
         WHERE bc.rating = $1 AND bc.asset = $2;';
    var assetInsertQuery =
        'INSERT INTO ratingsContent (asset, rating, person) VALUES ($1, $2, $3);';
    var ratingId = req.query.ratingId;
    var assetId = req.query.assetId;

    var json = utils.standardJson(req);

    if (!ratingId) {
        errors.report('MissingParameters', req, res);
        return;
    }
    if (!assetId) {
        errors.report('MissingParameters', req, res);
        return;
    }

    db.query(
        ratingQuery, [ratingId],
        function(err, result) {
            if (err || !result.rows) {
                errors.report('Database', req, res, err);
                return;
            }
            if (!result.rows.length) {
                errors.report('NoMatch', req, res);
                return;
            }
            json.rating = {
                id : result.rows[0].id,
                description : result.rows[0].description,
                value : result.rows[0].value
            };

            db.query(
                assetsQuery, [json.rating.id, assetId],
                function(err, result) {
                    if (err) {
                        errors.report('Database', req, res, err);
                        return;
                    }
                    if (result.rows && result.rows.length > 0) {
                        errors.report('AssetExists', req, res);
                        return;
                    }

                    db.query(
                        assetInsertQuery, [assetId, json.rating.id, req.session.user.id],
                        function(err, result) {
                            if (err) {
                                errors.report('Database', req, res, err);
                                return;
                            }
                            res.json(json);
                        });
                });
        });
};

module.exports.removeAsset = function(db, req, res) {
    /*jshint multistr:true */
    var ratingQuery =
        'SELECT b.id, b.description, b.value, b.channelId \
         FROM ratings b WHERE b.id = $1;';
    var assetsQuery =
        'SELECT bc.asset FROM ratingsContent bc \
         WHERE bc.rating = $1 AND bc.asset = $2;';
    var assetDeleteQuery =
        'DELETE FROM ratingsContent WHERE rating = $1 AND asset = $2 AND person = $3;';
    var ratingId = req.query.ratingId;
    var assetId = req.query.assetId;

    var json = utils.standardJson(req);

    if (!ratingId) {
        errors.report('MissingParameters', req, res);
        return;
    }
    if (!assetId) {
        errors.report('MissingParameters', req, res);
        return;
    }

    db.query(
        ratingQuery, [ratingId],
        function(err, result) {
            if (err || !result.rows) {
                errors.report('Database', req, res, err);
                return;
            }
            if (!result.rows.length) {
                errors.report('NoMatch', req, res);
                return;
            }

            json.rating = {
                id : result.rows[0].id,
                description : result.rows[0].description,
                value : result.rows[0].value
            };
            db.query(
                assetsQuery, [json.rating.id, assetId],
                function(err, result) {
                    if (err) {
                        errors.report('Database', req, res, err);
                        return;
                    }
                    if (!result.rows || !result.rows.length) {
                        errors.report('NoMatch', req, res);
                        return;
                    }

                    db.query(
                        assetDeleteQuery, [json.rating.id, assetId, req.session.user.id],
                        function(err, result) {
                            if (err) {
                                errors.report('Database', req, res, err);
                                return;
                            }
                            res.json(json);
                        });
                });
        });
};

