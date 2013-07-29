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
var errors = require('./errors.js');

var Janitor = (function() {
    var frequentPeriod = 60 * 1000;
    var frequentRunning = false;

    var dailyPeriod = 24 * 60 * 60 * 1000;
    var dailyRunning = false;

    function frequent()
    {
        if (frequentRunning) {
            return;
        }

        frequentRunning = true;
        console.log("FREQUENT");

        app.db.dbQuery(function(client) {
            client.query("select ct_frequentMaintenance()", [],
                function(err) {
                    if (err) {
                        errors.log(err);
                    }

                    frequentRunning = false;
                    console.log("boo yeah");
                    setTimeout(frequent, frequentPeriod);
                });
        });
    }

    function daily()
    {
        if (dailyRunning) {
            return;
        }

        dailyRunning = true;
        console.log("DAILY");

        app.db.dbQuery(function(client) {
            client.query("select ct_dailyMaintenance()", [],
                function(err) {
                    if (err) {
                        errors.log(err);
                    }

                    frequentRunning = false;
                    console.log("going to run again at .. " + dailyRunning);
                    setTimeout(daily, dailyPeriod);
                });
        });
    }

    function Janitor()
    {
        frequent();
        daily();
    }

    return Janitor;
})();

module.exports.Janitor = Janitor;

