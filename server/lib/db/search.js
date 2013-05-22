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
    var query =
       'SELECT a.id, sum(temp.namerank) as namerank, sum(temp.tagrank) as tagrank, \
        (sum(temp.namerank) + sum(temp.tagrank)) / (1 + sum(CASE WHEN temp.tagrank > 0 THEN 1 ELSE 0 END)) as rank, \
        max(a.license) as license, max(partners.id) as partnerid, \
        max(partners.name) AS partnername, max(a.version) as version, max(a.image) as image, max(a.name) as name, \
        CASE WHEN max(temp.points) IS NULL THEN 0 ELSE max(temp.points) END AS points \
    FROM \
    ( \
        SELECT a.id as id, p.points as points, \
        ts_rank_cd(a.en_index, plainto_tsquery(\'english\', $1)) as namerank, \
        0 as tagrank \
        FROM assets a \
        INNER JOIN subChannelAssets s ON (a.id = s.asset)  \
        LEFT JOIN assetPrices p ON (p.asset = a.id AND p.store = $5)  \
        WHERE \
        a.en_index @@ plainto_tsquery(\'english\', $1) AND \
        s.channel = $2 \
      UNION \
        SELECT a.id as id, p.points as points, \
        0 as namerank, \
        ts_rank_cd(a.en_index, plainto_tsquery(\'english\', $1)) as tagrank \
        FROM assets a \
        INNER JOIN subChannelAssets s ON (a.id = s.asset) \
        LEFT JOIN assetPrices p ON (p.asset = a.id AND p.store = $5)  \
        LEFT JOIN assetTags at ON (a.id = at.asset)  \
        LEFT JOIN tags t on (t.id = at.tag) \
        WHERE \
        s.channel = $2 AND \
        t.en_index @@ plainto_tsquery(\'english\', $1) AND \
        t.type in (select id from tagtypes where type in (\'category\', \'descriptive\', \'author\', \'contributor\')) \
      UNION \
        SELECT a.id as id, p.points as points, 1 as namerank, 1 as tagrank \
        FROM assets a \
        LEFT JOIN assetPrices p ON (p.asset = a.id AND p.store = $5) \
        LEFT JOIN assetTags at ON (a.id = at.asset)  \
        LEFT JOIN tags t on (t.id = at.tag) \
        WHERE \
        t.title = $1 AND t.type in (SELECT id FROM tagtypes WHERE type = \'easter eggs\') \
    ) as temp \
        LEFT JOIN assets a ON (a.id = temp.id) \
        LEFT JOIN partners ON (a.author = partners.id) \
    GROUP BY a.id \
    ORDER BY rank DESC, max(a.name) LIMIT $3 OFFSET $4   \
    ;';

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
         LEFT JOIN storeChannels sc  ON (c.topLevel = sc.channel) \
         WHERE sc.store = $2 and c.en_index @@ query  \
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
        'channelId'     : req.query.channelId,
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
