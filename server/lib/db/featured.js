var utils = require('../utils.js');
var lister = require('../lister.js');

module.exports = function(db, req, res) {
    var channelId = req.query.channelId;
    var pricePoint = req.query.pricePoint || 'All';
    var defaultPageSize = 25;
    var pageSize = parseInt(req.query.pageSize, 10) || defaultPageSize;
    var offset = parseInt(req.query.offset, 10) || 0;

    var args =  {
        'channelId'  : channelId,
        'pageSize'   : pageSize,
        'offset'     : offset,
        'pricePoint' : pricePoint
    };
    var json = {
        device : req.session.user.device,
        authStatus : req.session.authorized,
        points : req.session.user.points,
        offset : offset,
        hasMoreAssets : false,
        channels : []
    };

    lister.listFeatured(db, req, res, args, json);
};
