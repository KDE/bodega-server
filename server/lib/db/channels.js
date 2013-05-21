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
var lister = require('../lister.js');

module.exports = function(db, req, res) {
    /*jshint multistr:true */
    var listTopChannelsQuery =
        "SELECT DISTINCT c.id, c.image, c.name, c.description, c.assetCount FROM channels c \
         LEFT JOIN storeChannels d \
         ON (c.id = d.channel) where d.store = $1 and c.parent IS NULL \
         ORDER BY c.name LIMIT $2 OFFSET $3";
    /*jshint multistr:true */
    var listParentChannelsQuery =
        "SELECT DISTINCT c.id, c.image, c.name, c.description, c.assetCount FROM channels c \
         LEFT JOIN storeChannels d \
         ON (c.id = d.channel) where d.store = $1 and c.parent = $2 \
         ORDER BY c.name LIMIT $3 OFFSET $4";
    var defaultPageSize = 25;
    var args = {
        channelId: req.params.parentChannel,
        offset: req.query.offset || 0,
        pageSize: req.query.pageSize || defaultPageSize
    };

    var query;
    var values = [];


    values[0] = req.session.user.store;

    if (!args.channelId) {
        query = listTopChannelsQuery;
    } else {
        query = listParentChannelsQuery;
        values[1] = args.channelId;
    }
    values.push(args.pageSize, args.offset);

    db.query(
        query, values,
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }
            var json = utils.standardJson(req);
            json.offset = args.offset;
            json.hasMoreAssets = false;

            if (!result) {
                res.json(json);
                return;
            }
            json.channels = result.rows;
            if (args.channelId) {
                args.pageSize = args.pageSize - result.rows.length;
                lister.listAssets(db, req, res, args, json);
            } else {
                res.json(json);
            }
        });
};
