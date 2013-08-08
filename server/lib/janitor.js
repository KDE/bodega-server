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

require('../app.js');
var errors = require('./errors.js');

var Janitor = (function() {
    var frequentPeriod = 60 * 1000;
    var frequentRunning = false;

    var dailyPeriod = 24 * 60 * 60 * 1000;
    var dailyRunning = false;

    function oneTime()
    {
        // relay the disource settings from the config to the database
        var config = app.config.service.discourse;
        if (config &&
            config.database &&
            config.database !== '') {
            var connectString = "dbname=" + config.database;

            if (config.username && config.username !== '') {
                connectString += " user=" + config.username;
            }

            if (config.password && config.password !== '') {
                connectString += " password=" + config.password;
            }

            if (config.host && config.host !== '') {
                connectString += " hostaddr=" + config.host;
            }

            app.db.dbQuery(function(client) {
                client.query("select ct_createSetting('discourseConnectString', $1);", [connectString],
                             function(err) {
                                 if (err) {
                                     errors.log(err);
                                 }
                             });
            });
        } else {
            app.db.dbQuery(function(client) {
                client.query("select ct_removeSetting('discourseConnectString');", [],
                             function(err) {
                                 if (err) {
                                     errors.log(err);
                                 }
                             });
            });
        };
    }

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
                        errors.log(err);
                    }

                    frequentRunning = false;
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

        app.db.dbQuery(function(client) {
            client.query("select ct_dailyMaintenance()", [],
                function(err) {
                    if (err) {
                        errors.log(err);
                    }

                    frequentRunning = false;
                    setTimeout(daily, dailyPeriod);
                });
        });
    }

    function Janitor()
    {
        oneTime();
        frequent();
        daily();
    }

    return Janitor;
})();

module.exports.Janitor = Janitor;

