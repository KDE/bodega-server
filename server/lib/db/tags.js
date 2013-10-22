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

var assetRules = require('../../assetRules.js');
var utils = require('../utils.js');
var errors = require('../errors.js');

var sanitize = require('validator').sanitize;

module.exports.listAssetTypeTags = function(db, req, res) {
    if (!req.params.assetType) {
        errors.report('MissingParameters', req, res);
        return;
    }

    db.query("SELECT t.id, t.type as typeid, tt.type as type, t.title \
              FROM tags at LEFT JOIN relatedTags rt ON (rt.tag = at.id) \
              LEFT JOIN tags t ON (rt.related = t.id) \
              LEFT JOIN tagTypes tt ON (t.type = tt.id) \
              WHERE at.title = $1 AND at.type IN (SELECT id FROM tagTypes where type = 'assetType') \
              ORDER BY t.id",
              [req.params.assetType],
              function(err, result) {
                  if (err) {
                      errors.report('Database', req, res, err);
                      return;
                  }

                  if (result.rowCount < 1) {
                      errors.report('TagIdInvalid', req, res);
                      return;
                  }

                  var json = utils.standardJson(req);
                  json.tags = assetRules.mandatoryTags[req.params.assetType];
                  if (!json.tags) {
                      json.tags = assetRules.mandatoryTags.generic;
                  }

                  for (var i = 0; i < result.rowCount; ++i) {
                      var row = result.rows[i];
                      if (!row.id) {
                          continue;
                      }

                      if (!json.tags.hasOwnProperty(row.type)) {
                          json.tags[row.type] = { mandatory: false, multi: true, name: row.type };
                      }

                      if (!Array.isArray(json.tags[row.type].tags)) {
                          json.tags[row.type].tags = [];
                      }

                      json.tags[row.type].tags.push(row);
                  }

                  //console.log(JSON.stringify(json.tags, 0, 2));
                  res.json(json);
              }
            );
};

module.exports.listTypes = function(db, req, res) {
    var json = utils.standardJson(req);

    var q = db.query(
        "select id, type from tagtypes order by id",
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

function listAssetTags(partner, db, req, res) {
    var asset = utils.parseNumber(req.params.assetId);

    if (asset < 1) {
        errors.report('MissingParameters', req, res);
        return;
    }

    var json = utils.standardJson(req);

    var q = db.query(
         "select tags.id, tagtypes.id as typeid, tagtypes.type as type, title, (case when partner = $1 then true else false end) as editable\
          from assettags join tags on assettags.tag = tags.id\
          join tagtypes on tagtypes.id = tags.type\
          where asset = $2 order by tags.id",
        [partner, asset],
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }
            json.asset = asset;
            json.tags = result.rows;
            res.json(json);
        });
}

module.exports.listAssetTags = function(db, req, res) {
    utils.partnerId(db, req, res, listAssetTags);
};

function listChannelTags(partner, db, req, res) {
    var channel = utils.parseNumber(req.params.channel);

    if (channel < 1) {
        errors.report('MissingParameters', req, res);
        return;
    }

    var json = utils.standardJson(req);

    var q = db.query(
         "select tags.id, tagtypes.id as typeid, tagtypes.type as type, title, (case when partner = $1 then true else false end) as editable\
          from channeltags join tags on channeltags.tag = tags.id\
          join tagtypes on tagtypes.id = tags.type\
          where channel = $2 order by tags.id",
        [partner, channel],
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }
            json.channel = channel;
            json.tags = result.rows;
            res.json(json);
        });
}

module.exports.listChannelTags = function(db, req, res) {
    utils.partnerId(db, req, res, listChannelTags);
};

function listTags(partner, db, req, res) {

    var i = 2;
    var params = [partner];
    var typed = req.params.type !== undefined;

    var query = "select tags.id, tags.type as typeid, tagtypes.type as type, title, \
                 (case when partner = $1 then true else false end) as editable \
                 from tags join tagtypes on (tagtypes.id = tags.type)";

    var whereClause = false;

    //console.log('Listing tags with ' + JSON.stringify(req.params, 2));
    //console.log('Listing tags with ' + JSON.stringify(req.query, 2));
    if (req.query.query) {
        whereClause = true;
        query += " where tags.title ~* $" + i;
        if (!typed) {
            query += " or tagtypes.type ~* $" + i;
        }
        ++i;
        params.push(req.query.query);
    }

    if (typed) {
        if (whereClause) {
            query += " and ";
        } else {
            whereClause = true;
            query += " where ";
        }
        query += " tagtypes.type = $" + i;
        params.push(req.params.type);
        ++i;
    }

    if (whereClause) {
        query += " and ";
    } else {
        whereClause = true;
        query += " where ";
    }

    query += " (partner IS NULL OR partner = $1) ";
    query += " order by editable desc, title limit $" + (i++) + " offset $" + (i);
    ++i;

    //errors.logDbQuery("List tags", db, query, params);

    //take an arbitrary limit if not specified
    if (req.query.limit) {
        params.push(Math.min(100, utils.parseNumber(req.query.limit)));
    } else {
        params.push(100);
    }
    params.push(utils.parseNumber(req.query.start));

    var json = utils.standardJson(req);

    var q = db.query(
        query, params,
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }

            json.tags = result.rows;
            var countParams = [];

            var j = 1;

            var countQuery = "select count(tags.id)::int as totalTags from tags join tagTypes ON (tags.type = tagTypes.id)";
            var countWhereClause = null;

            if (typed) {
                countWhereClause = " where tagtypes.type = $" + j;
                countParams.push(req.params.type);
                ++j;
            }

            if (req.query.query) {
                if (countWhereClause) {
                    countWhereClause += " and ";
                } else {
                    countWhereClause = " where ";
                }

                countWhereClause += "tags.title ~* $" + j;
                if (!typed) {
                    query += " or tagtypes.type ~* $" + j;
                }
                countParams.push(req.query.query);
                ++j;
            }

            if (countWhereClause) {
                countQuery += countWhereClause;
            }

            //errors.logDbQuery("Count", db, countQuery, countParams);

            db.query(countQuery, countParams, function(err, countResult) {
                if (err) {
                    errors.report('Database', req, res, err);
                    return;
                }

                json.totalTags = countResult.rows[0].totaltags;
                res.json(json);
            });
        });
}

module.exports.listTags = function(db, req, res) {
    utils.partnerId(db, req, res, listTags);
};

function create(partner, db, req, res) {

    var title = sanitize(req.body.title).trim();
    if (title === '') {
        errors.report('MissingParameters', req, res);
        return;
    }

    if (req.body.type === undefined) {
        errors.report('MissingParameters', req, res);
        return;
    }

    utils.createTagIfMissing(partner, req.body.type, title, db, req, res,
            function(err, result, db, req, res) {
                 if (err) {
                     errors.report(err.type, req, res, err);
                     return;
                 }

                 var json = utils.standardJson(req);
                 if (result.rowCount > 0) {
                    json.id = result.rows[0].id;
                 }
                 res.json(json);
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

    var id = utils.parseNumber(req.params.tag);
    if (!id || id < 1) {
        errors.report('TagIdInvalid', req, res, errors.create("Invalid Tag Id", "Invalid tag passed into tag update: " + id));
        return;
    }

    var title = sanitize(req.body.title).trim();
    if (title === '') {
        errors.report('MissingParameters', req, res);
        return;
    }

    if (req.body.type === undefined) {
        errors.report('MissingParameters', req, res);
        return;
    }

    db.query(
        "select id from tagtypes where type = $1",
        [req.body.type],
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            } else if (result.rowCount < 1) {
                errors.report('TagTypeInvalid', req, res, err);
                return;
            }

            var type = result.rows[0].id;
            db.query(
                "update tags set type = $1, title = $2 where id = $3 and partner = $4",
                [type, title, id, partner],
                function(err, result) {
                    if (err) {
                        errors.report('Database', req, res, err);
                        return;
                    } else if (result.rowCount === 0) {
                        errors.report('TagIdInvalid', req, res, err);
                        return;
                    }
                    res.json(utils.standardJson(req));
                });
        });
}

module.exports.update = function(db, req, res) {
    utils.partnerId(db, req, res, update);
};

module.exports.listLicenses = function(db, req, res) {
    db.query("SELECT id, name FROM licenses ORDER BY id", [],
             function(err, result) {
                 if (err) {
                     errors.report('Database', req, res, err);
                     return;
                 }

                 var json = utils.standardJson(req);
                 json.licenses = result.rows;
                 res.json(json);
             });
};
