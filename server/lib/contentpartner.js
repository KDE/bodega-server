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

var utils = require('./utils.js');
var dbParticipantInfo = require('./db/participantInfo.js');

var ContentPartner = (function()
{
    function ContentPartner()
    {
    }

    ContentPartner.prototype.participantInfo = function(req, res) {
        app.db.dbQuery(dbParticipantInfo, req, res);
    };

    ContentPartner.prototype.listAssets = function(req, res) {

    };

    return ContentPartner;
})();

module.exports.ContentPartner = ContentPartner;
