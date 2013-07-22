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

function searchAssets(db, req, res, args, json)
{
    // the following query does the following, from the inside out:
    //      query for matching assets by name
    //      then query for matching assets by tags
    //      UNION the results into a single temporary table
    //      query on that table to generate the final results
        //(sum(namerank) + sum(tagrank)) / (1 + sum(CASE WHEN tagrank > 0 THEN 1 ELSE 0 END)) as rank \
    var query =
       'SELECT a.id, \
               ts_rank_cd(a.en_index, plainto_tsquery(\'english\', $1)) as namerank, \
               ts_rank_cd(a.en_tagsIndex, plainto_tsquery(\'english\', $1)) as tagrank, \
               ts_rank_cd(a.en_index, plainto_tsquery(\'english\', $1)) + \
               ts_rank_cd(a.en_tagsIndex, plainto_tsquery(\'english\', $1)) as rank, \
               a.license, partners.id, \
               partners.name, a.version, a.image, a.name, \
               (CASE WHEN p.points IS NULL THEN 0 ELSE p.points END)::int AS points \
        FROM assets a \
        INNER JOIN subChannelAssets s ON (a.id = s.asset) \
        JOIN channels c ON (c.id = s.channel) \
        LEFT JOIN assetPrices p ON (p.asset = a.id AND p.store = $5 AND p.ending IS null) \
        LEFT JOIN partners ON (a.partner = partners.id) \
        WHERE s.channel = $2 AND \
              c.store = $5 AND \
              ts_rank_cd(a.en_index, plainto_tsquery(\'english\', $1)) + \
              ts_rank_cd(a.en_tagsIndex, plainto_tsquery(\'english\', $1)) > 0 \
        ORDER BY rank DESC LIMIT $3 OFFSET $4;';

    console.log(query);
    console.log([args.query, args.channelId, args.pageSize, args.offset, req.session.user.store]);
    db.query(
        query,
        [args.query, args.channelId, args.pageSize, args.offset, req.session.user.store],
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }
            json.assets = result.rows;
            res.json(json);
        });
}

//XXX not sure if this makes
function searchChannels(db, req, res, args, json)
{
    var query =
        'SELECT c.id, c.image, c.name, c.description FROM channels c \
         CROSS JOIN  plainto_tsquery(\'english\', $1) as query \
         WHERE c.store = $2 and c.en_index @@ query  \
         ORDER BY  ts_rank_cd(c.en_index, query) DESC, c.name  \
         LIMIT $3 OFFSET $4;';

    db.query(
        query,
        [args.query, req.session.user.store,
         args.pageSize, args.offset],
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }
            json.assets = result.rows;
            res.json(json);
        });
}

module.exports = function(db, req, res) {
    var defaultPageSize = 25;
    var pageSize = req.query.pageSize || defaultPageSize;
    var offset = req.query.offset || 0;

    var args =  {
        'query'         : req.query.query,
        'pageSize'      : pageSize,
        'offset'        : offset,
        'channelId'     : req.query.channelId
    };
    var json = utils.standardJson(req);
    json.channels = [];
    json.assets = [];

    if (!args.query) {
        //"Search query was empty.",
        errors.report('MissingParameters', req, res);
        return;
    }

    if (!args.channelId) {
        //"Search requires a channel in which to perform the search.",
        errors.report('MissingParameters', req, res);
        return;
    }

    searchAssets(db, req, res, args, json);
};
