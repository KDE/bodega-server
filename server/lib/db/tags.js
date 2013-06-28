/*
    Copyright 2013 Coherent Theory LLC

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
var sanitize = require('validator').sanitize;


module.exports.listTypes = function(db, req, res) {
    var json = utils.standardJson(req);

    var q = db.query(
        "select id, type from tagtypes",
        [],
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }
            json.types = result.rows;
            res.json(json);
        });
};

module.exports.listAssetTags = function(db, req, res) {
    var asset = utils.parseNumber(req.params.assetId);

    if (asset < 1) {
        errors.report('MissingParameters', req, res);
        return;
    }

    var json = utils.standardJson(req);

    var q = db.query(
         "select tags.id, tagtypes.id as type, tagtypes.type as typename, title\
          from assettags join tags on assettags.tag = tags.id\
          join tagtypes on tagtypes.id = tags.type\
          where asset = $1",
        [asset],
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }
            json.asset = asset;
            json.tags = result.rows;
            res.json(json);
        });
};

module.exports.listChannelTags = function(db, req, res) {
    var channel = utils.parseNumber(req.params.channel);

    if (channel < 1) {
        errors.report('MissingParameters', req, res);
        return;
    }

    var json = utils.standardJson(req);

    var q = db.query(
         "select tags.id, tagtypes.id as type, tagtypes.type as typename, title\
          from channeltags join tags on channeltags.tag = tags.id\
          join tagtypes on tagtypes.id = tags.type\
          where channel = $1",
        [channel],
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }
            json.channel = channel;
            json.tags = result.rows;
            res.json(json);
        });
};

module.exports.listTags = function(db, req, res) {

    var query = "select tags.id, tags.type, tagtypes.type as typename, title \
                 from tags join tagtypes on (tagtypes.id = tags.type)"

    var params = new Array();

    var type = utils.parseNumber(req.params.type);
    if (type > 0) {
        query += " where tags.type = $1";
        params.push(req.params.type)
    }

    query += " order by title";
    var json = utils.standardJson(req);

    var q = db.query(
        query, params,
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }

            if (req.params.type) {
                json.type = req.params.type;
            }

            json.tags = result.rows;
            res.json(json);
        });
};


function create(partner, db, req, res) {

    var title = sanitize(req.body.title).trim();
    if (title === '') {
        errors.report('MissingParameters', req, res);
        return;
    }

    var type = utils.parseNumber(req.body.type);
    if (type <= 0) {
        errors.report('MissingParameters', req, res);
        return;
    }

    db.query("select * from tags where partner = $1 and type = $2 and title = $3",
             [partner, type, title],
             function(err, result) {
                 if (err) {
                     errors.report('Database', req, res, err);
                     return;
                 }

                 if (result.rowCount > 0) {
                     errors.report('TagExists', req, res, err);
                     return;
                 }

                db.query("insert into tags (partner, type, title) values ($1, $2, $3) returning id as id",
                         [partner, type, title],
                         function(err, result) {
                             if (err) {
                                 errors.report('Database', req, res, err);
                                 return;
                             }

                             var json = utils.standardJson(req);
                             json.id = result.rows[0].id;
                             res.json(json);
                    });
             });
}

module.exports.create = function(db, req, res) {
    utils.partnerId(db, req, res, create);
};


function remove(partner, db, req, res) {

    var id = req.params.tag;
    if (!id || id === '') {
        errors.report('TagIdInvalid', req, res, errors.create("Invalid Tag Id", "Invalid tag passed into tag deletion: " + id));
        return;
    }

    db.query("delete from tags where id = $1 and partner = $2", [id, partner],
             function(err, result) {
                if (err) {
                    errors.report('Database', req, res, err);
                    return;
                }

                if (result.rowCount < 1) {
                    errors.report('TagNotDeleted', req, res);
                    return;
                }

                res.json(utils.standardJson(req));
             });
}

module.exports.remove = function(db, req, res) {
    utils.partnerId(db, req, res, remove);
};


function update(partner, db, req, res) {

    var id = req.params.tag;
    if (!id || id === '') {
        errors.report('TagIdInvalid', req, res, errors.create("Invalid Tag Id", "Invalid tag passed into tag update: " + id));
        return;
    }

    var title = sanitize(req.body.title).trim();
    if (title === '') {
        errors.report('MissingParameters', req, res);
        return;
    }

    var type = utils.parseNumber(req.body.type);
    if (type <= 0) {
        errors.report('MissingParameters', req, res);
        return;
    }

    db.query(
        "update tags set type = $1, title = $2 where id = $3 and partner = $4",
        [type, title, id, partner],
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }

            res.json(utils.standardJson(req));
        });
}

module.exports.update = function(db, req, res) {
    utils.partnerId(db, req, res, update);
};

