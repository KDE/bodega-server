var utils = require('../utils.js');
var errors = require('../errors.js');
var lister = require('../lister.js');

module.exports = function(db, req, res) {
    /*jshint multistr:true */
    var listTopChannelsQuery =
        "SELECT c.id, c.image, c.name, c.description, c.assetCount FROM channels c \
         LEFT JOIN deviceChannels d \
         ON (c.id = d.channel) where d.device = $1 and c.parent IS NULL \
         ORDER BY c.name LIMIT $2 OFFSET $3";
    /*jshint multistr:true */
    var listParentChannelsQuery =
        "SELECT c.id, c.image, c.name, c.description, c.assetCount FROM channels c \
         LEFT JOIN deviceChannels d \
         ON (c.id = d.channel) where d.device = $1 and c.parent = $2 \
         ORDER BY c.name LIMIT $3 OFFSET $4";
    var defaultPageSize = 25;
    var args = {
        channelId: req.params.parentChannel,
        offset: req.query.offset || 0,
        pageSize: req.query.pageSize || defaultPageSize
    };

    var query;
    var values = [];


    values[0] = req.session.user.device;

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
            var json = {
                device : req.session.user.device,
                authStatus : req.session.authorized,
                points : req.session.user.points,
                offset : args.offset,
                hasMoreAssets: false
            };

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
