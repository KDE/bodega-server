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
        'SELECT b.id, b.name, b.public, b.wishlist \
         FROM collections b WHERE b.person = $1        \
         ORDER BY b.name LIMIT $2 OFFSET $3;';
    var defaultPageSize = 25;
    var pageSize = parseInt(req.query.pageSize, 10) || defaultPageSize;
    var offset = parseInt(req.query.offset, 10) || 0;
    var json = utils.standardJson(req);
    json.collections = [];

    db.query(
        queryString, [req.session.user.id, pageSize + 1, offset],
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }

            if (result.rows.length > pageSize) {
                json.hasMoreCollections = true;
                result.rows.pop();
            }

            json.collections = result.rows;
            res.json(json);
        });
};

module.exports.create = function(db, req, res) {
    /*jshint multistr:true */
    var insertQuery =
        'INSERT INTO collections (person, name, public, wishlist) \
         VALUES ($1, $2, $3, $4) RETURNING id;';
    var searchQuery =
        'SELECT * FROM collections WHERE person = $1 AND name = $2;';
    var defaultPageSize = 25;
    var name = req.query.name;
    var isPublic = utils.parseBool(req.query.public);
    var isWishList = utils.parseBool(req.query.wishlist);

    if (!name) {
        // Name of the collection is missing.
        errors.report('MissingParameters', req, res);
        return;
    }

    db.query(
        searchQuery, [req.session.user.id, name],
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }

            if (result.rows.length > 0) {
                // "Collection with the name '" + name + "' already exists!",
                errors.report('CollectionExists', req, res);
                return;
            }
            db.query(
                insertQuery, [req.session.user.id, name, isPublic, isWishList],
                function(err, result) {
                    if (err || !result.rows || result.rows.length !== 1) {
                        errors.report('Database', req, res, err);
                        return;
                    }
                    var json = utils.standardJson(req);
                    json.collections = [{
                            id : result.rows[0].id,
                            name : name,
                            public : isPublic,
                            wishlist : isWishList
                        }];
                    res.json(json);
                });
        });
};

module.exports.remove = function(db, req, res) {
    /*jshint multistr:true */
    var deleteQuery =
        'DELETE FROM collections WHERE person = $1 AND id = $2;';
    var searchQuery =
        'SELECT * FROM collections WHERE person = $1 AND id = $2;';
    var defaultPageSize = 25;
    var collectionId = req.query.collectionId;

    if (!collectionId) {
        //"Id of the collection is missing.",
        errors.report('MissingParameters', req, res);
        return;
    }

    db.query(
        searchQuery, [req.session.user.id, collectionId],
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }

            if (!result.rows || result.rows.length <= 0) {
                //Collection with the id"  + collectionId + " doesn't exist!"
                errors.report('NoMatch', req, res);
                return;
            }
            db.query(
                deleteQuery, [req.session.user.id, collectionId],
                function(err, result) {
                    if (err) {
                        errors.report('Database', req, res, err);
                        return;
                    }

                    res.json(utils.standardJson(req));
                });
        });
};

module.exports.listAssets = function(db, req, res) {
    /*jshint multistr:true */
    var collectionQuery =
        'SELECT b.id, b.name, b.public, b.wishlist \
         FROM collections b WHERE b.person = $1 AND b.id = $2;';
    var assetsQuery =
        'SELECT DISTINCT a.id, a.license, partners.id as partnerId, \
         partners.name AS partnername, a.version, a.path, a.image, a.name, \
         CASE WHEN p.points IS NULL THEN 0 ELSE p.points END AS points \
         FROM collectionsContent bc \
         INNER JOIN assets a ON (bc.asset = a.id) \
         LEFT JOIN partners ON (a.author = partners.id) \
         LEFT JOIN assetPrices p ON (p.asset = a.id AND p.store = $1) \
         INNER JOIN collections b ON (b.person = $2) \
         WHERE bc.collection = $3 \
         ORDER BY a.name LIMIT $4 OFFSET $5';
    var defaultPageSize = 25;
    var pageSize = parseInt(req.query.pageSize, 10) || defaultPageSize;
    var offset = parseInt(req.query.offset, 10) || 0;
    var collectionId = req.query.collectionId;

    var json = utils.standardJson(req);
    json.collection = {};
    if (!collectionId) {
        //Id of the collection is missing.
        errors.report('MissingParameters', req, res);
        return;
    }

    db.query(
        collectionQuery, [req.session.user.id, collectionId],
        function(err, result) {
            if (err || !result.rows || !result.rows.length) {
                errors.report('Database', req, res, err);
                return;
            }

            json.collection = {
                id : result.rows[0].id,
                name : result.rows[0].name,
                public : result.rows[0].public,
                wishlist : result.rows[0].wishlist,
                assets : []
            };

            db.query(
                assetsQuery, [req.session.user.store, req.session.user.id,
                              json.collection.id,
                              pageSize + 1, offset],
                function(err, result) {
                    if (err) {
                        errors.report('Database', req, res, err);
                        return;
                    }
                    if (result.rows.length > pageSize) {
                        json.hasMoreAssets = true;
                        result.rows.pop();
                    }
                    json.collection.assets = result.rows;
                    res.json(json);
                });
        });
};

module.exports.addAsset = function(db, req, res) {
    /*jshint multistr:true */
    var collectionQuery =
        'SELECT b.id, b.name, b.public, b.wishlist \
         FROM collections b WHERE b.person = $1 AND b.id = $2;';
    var assetsQuery =
        'SELECT bc.asset as assetId FROM collectionsContent bc \
         WHERE bc.collection = $1 AND bc.asset = $2;';
    var assetInsertQuery =
        'INSERT INTO collectionsContent (collection, asset) VALUES ($1, $2);';
    var collectionId = req.query.collectionId;
    var assetId = req.query.assetId;

    var json = utils.standardJson(req);
    json.collection = [];

    if (!collectionId) {
        //"Id of the collection is missing.",
        errors.report('MissingParameters', req, res);
        return;
    }
    if (!assetId) {
        //"Id of the asset is missing."
        errors.report('MissingParameters', req, res);
        return;
    }

    db.query(
        collectionQuery, [req.session.user.id, collectionId],
        function(err, result) {
            if (err || !result.rows) {
                errors.report('Database', req, res, err);
                return;
            }
            if (!result.rows.length) {
                //"Could not find a collection with the given id.",
                errors.report('NoMatch', req, res);
                return;
            }
            json.collection = {
                id : result.rows[0].id,
                name : result.rows[0].name,
                public : result.rows[0].public,
                wishlist : result.rows[0].wishlist
            };

            db.query(
                assetsQuery, [json.collection.id, assetId],
                function(err, result) {
                    if (err) {
                        errors.report('Database', req, res, err);
                        return;
                    }
                    if (result.rows && result.rows.length > 0) {
                        //"The given asset is already in the collection.",
                        errors.report('AssetExists', req, res);
                        return;
                    }

                    db.query(
                        assetInsertQuery, [json.collection.id, assetId],
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
    var collectionQuery =
        'SELECT b.id, b.name, b.public, b.wishlist \
         FROM collections b WHERE b.person = $1 AND b.id = $2;';
    var assetsQuery =
        'SELECT bc.asset as assetId FROM collectionsContent bc \
         WHERE bc.collection = $1 AND bc.asset = $2;';
    var assetDeleteQuery =
        'DELETE FROM collectionsContent WHERE collection = $1 AND asset = $2;';
    var collectionId = req.query.collectionId;
    var assetId = req.query.assetId;

    var json = utils.standardJson(req);
    json.collection = [];

    if (!collectionId) {
        //"Id of the collection is missing.",
        errors.report('MissingParameters', req, res);
        return;
    }
    if (!assetId) {
        //"Id of the asset is missing."
        errors.report('MissingParameters', req, res);
        return;
    }

    db.query(
        collectionQuery, [req.session.user.id, collectionId],
        function(err, result) {
            if (err || !result.rows) {
                errors.report('Database', req, res, err);
                return;
            }
            if (!result.rows.length) {
                //"Could not find a collection with the given id.",
                errors.report('NoMatch', req, res);
                return;
            }
            json.collection = {
                id : result.rows[0].id,
                name : result.rows[0].name,
                public : result.rows[0].public,
                wishlist : result.rows[0].wishlist
            };

            db.query(
                assetsQuery, [json.collection.id, assetId],
                function(err, result) {
                    if (err) {
                        errors.report('Database', req, res, err);
                        return;
                    }
                    if (!result.rows || !result.rows.length) {
                        //The given asset is not in the specified collection
                        errors.report('NoMatch', req, res);
                        return;
                    }

                    db.query(
                        assetDeleteQuery, [json.collection.id, assetId],
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
