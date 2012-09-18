var utils = require('./utils.js');
var errors = require('./errors.js');

var SortType = {
    'ByDefault'   : 0,
    'ByName'      : 1,
    'ByDate'      : 2,
    'ByAuthor'    : 4,
    'ByDownloads' : 8,
    'ByFavorites' : 16,
};
module.exports.SortType = SortType;

var OrderType = {
    'Ascending'  : 1,
    'Descending' : 2
};
module.exports.OrderType = OrderType;

function createQuerySort(sorters, options)
{
    var query = {
        join: ' ',
        order: 'ORDER BY '
    };

    for (var i = 0; i < sorters.length; ++i) {
        var sorter = sorters[i];

        switch (sorter.type) {
        case SortType.ByDate:
            if (!options.hasAssetChangelogs) {
                query.join += 'LEFT JOIN assetchangelogs ac \
                               ON (a.id = ac.asset) ';
            }
            query.order += 'ac.versionts';
            break;
        case SortType.ByAuthor:
            console.warn("FIXME: sorting by author not implemented");
            break;
        case SortType.ByDownloads:
            if (!options.hasDownloads) {
                query.join += 'LEFT JOIN (select downloads.asset, \
                   count(downloads.asset) as totalDownloads from downloads \
                   GROUP BY downloads.asset) dx ON (a.id = dx.asset) ';
            }
            query.order += 'CASE WHEN dx.totalDownloads IS NULL THEN 0 ELSE \
                            dx.totalDownloads END';
            break;
        case SortType.ByFavorites:
            if (!options.hasCollectionsContent) {
                query.join += 'LEFT JOIN (select bc.asset, \
                   count(bc.asset) as favCount from collectionscontent bc \
                   GROUP BY bc.asset) bx ON (a.id = bx.asset) ';
            }
            query.order += 'CASE WHEN bx.favCount IS NULL THEN 0 ELSE bx.favCount END';
            break;
        case SortType.ByDefault:
        case SortType.ByName:
            query.order += 'a.name';
            break;
        default:
            break;
        }

        switch (sorter.ordering) {
        case OrderType.Ascending:
            query.order += ' ASC';
            break;
        case OrderType.Descending:
            query.order += ' DESC';
            break;
        }

        if ((i + 1) < sorters.length) {
            query.order += ", ";
        }
    }

    return query;
}

function constructQuery(baseQuery, whereQuery, numParams, sorters, options)
{
    var query = baseQuery;
    var sortQuery = createQuerySort(sorters, options);

    query += ' ';
    query += sortQuery.join;
    query += ' ';
    query += whereQuery;
    query += ' ';
    query += sortQuery.order;
    query += ' ';
    query += 'LIMIT $' + (numParams + 1) +
        ' OFFSET $' + (numParams + 2) + ';';

    return query;
}


module.exports.listAssets = function listAssets(db, req, res, args, json)
{
    /*jshint multistr:true */
    var baseQuery =
        'SELECT a.id, a.license, partners.id as partnerId, \
         partners.name AS partnername, a.version, a.file, a.image, a.name, \
         CASE WHEN p.points IS NULL THEN 0 ELSE p.points END AS points \
         FROM assets a LEFT JOIN partners ON (a.author = partners.id) \
         INNER JOIN subChannelAssets s ON (a.id = s.asset) \
         LEFT JOIN assetPrices p ON (p.asset = s.asset AND p.device = $1) ';
    var whereQuery = 'WHERE s.channel = $2';
    var queryString = constructQuery(baseQuery, whereQuery, 2,
                                     [{
                                         type : SortType.ByName,
                                         ordering : OrderType.Ascending
                                     }],
                                     {
                                         hasAssetChangelogs : 0,
                                         hasDownloads : 0
                                     });

    //console.log(queryString);

    if (!args.channelId) {
        //"Listing by name requires a channel id.",
        errors.report('MissingParameters', req, res);
        return;
    }

    db.query(
        queryString, [req.session.user.device, args.channelId,
                      args.pageSize + 1, args.offset],
        function(err, result) {
            if (err) {
                errors.report('Database', req, res, err);
                return;
            }

            if (result.rows.length > args.pageSize) {
                json.hasMoreAssets = true;
                result.rows.pop();
            }

            json.assets = result.rows;
            res.json(json);
        });
};

module.exports.listFeatured = function listFeatured(db, req, res, args, json)
{
    console.warn("listFeatured not implemented!!!");
    res.json(json);
};
