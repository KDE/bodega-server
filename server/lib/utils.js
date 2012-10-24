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

module.exports.findImagePaths = function(req)
{
    var serverUrl = "http://" + req.header('host') + '/';
    var imageUrls = {
        tiny: serverUrl + 'images/22',
        small: serverUrl + 'images/32',
        medium: serverUrl + 'images/64',
        large: serverUrl + 'images/128',
        huge: serverUrl + 'images/512',
        previews: serverUrl + 'images/previews'
    };
    return imageUrls;
};

module.exports.recordDownload = function(db, req)
{
    var ip = req.headers['x-forwarded-for'];
    if (!ip) {
        ip = req.connection.socket ? req.connection.socket.remoteAddress
                                   : req.connection.remoteAddress;
        if (!ip) {
            ip = "0.0.0.0";
        }
    }
    db.query("SELECT ct_recordDownload($1, $2, $3, $4);",
            [req.session.user.id, req.params.assetId, ip,
             req.session.user.device],
            function(err, result) { }
            );
};

module.exports.standardJson = function(req, success)
{
    var json = {};

    if (req && req.session && req.session.authorized && req.session.user) {
        json.authStatus = req.session.authorized;
        json.device = req.session.user.device;
        json.points = req.session.user.points;
    } else {
        json.authStatus = false;
        json.device = 0;
        json.points = 0;
    }

    json.success = typeof success !== 'undefined' ? success : true;
    return json;
};

