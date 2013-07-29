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

var db = require('../app.js');

var Janitor = (function() {
    var frequentPeriod = 60000;
    var frequentRunning = false;

    function frequent()
    {
        if (frequentRunning) {
            return;
        }

        frequentRunning = true;

        app.db.dbQuery(function(client) {
            client.query("select ct_frequentMaintenance()", [],
                function(err) {
                    if (err) {
                        console.warn('-- Error:');
                        console.trace();
                        console.warn(err);
                        console.warn('-- end --');
                    }

                    frequentRunning = false;
                    setTimeout(frequent, frequentPeriod);
                });
        });
    }

    function Janitor()
    {
        frequent();
    }

    return Janitor;
})();

module.exports.Janitor = Janitor;

