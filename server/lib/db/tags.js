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

    if (!req.params.asset) {
        errors.report('MissingParameters', req, res);
        return;
    }

    var asset = req.params.asset;
    var json = utils.standardJson(req);

    var q = db.query(
         "select tagtypes.id as type, tagtypes.type as typename, title\
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

    if (!req.params.channel) {
        errors.report('MissingParameters', req, res);
        return;
    }

    var channel = req.params.channel;
    var json = utils.standardJson(req);

    var q = db.query(
         "select tagtypes.id as type, tagtypes.type as typename, title\
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
                 from tags \
                 join tagtypes on tagtypes.id = tags.type ";

    var params = new Array();
    
    if (req.params.type) {
        query += "where tags.type = $1;";
        params.push(req.params.type)
    }

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

