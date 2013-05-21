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

    var json = utils.standardJson(req);
    json.offset = offset;
    json.hasMore = false;
    json.channels = [];

    lister.listFeatured(db, req, res, args, json);
};
