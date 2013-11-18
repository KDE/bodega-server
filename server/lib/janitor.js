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

    var hourlyPeriod = 60 * 60 * 1000;
    var hourlyRunning = false;

    var dailyPeriod = 24 * 60 * 60 * 1000;
    var dailyRunning = false;

    function buildConnectString(config) {
        if (!config || !config.database || config.database === '') {
            return null;
        }

        var connectString = "dbname=" + config.database;

        if (config.username && config.username !== '') {
            connectString += " user=" + config.username;
        }

        if (config.password && config.password !== '') {
            connectString += " password=" + config.password;
        }

        if (config.host && config.host !== '') {
            connectString += " host=" + config.host;
        }

        return connectString;
    }

    function oneTime()
    {
        // relay the disource settings from the config to the database
        var userReplicationConnections = [];
        var config = app.config.service.discourse;
        var connectString = buildConnectString(config);
        if (connectString) {
            userReplicationConnections.push(connectString);
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
        }

        for (config in app.config.service.userReplication) {
            connectString = buildConnectString(app.config.service.userReplication[config]);
            if (connectString) {
                userReplicationConnections.push(connectString);
            }
        }

        if (userReplicationConnections.length > 0) {
            var query = "select ct_createSetting('userReplicationConnectStrings', $1)"
            app.db.dbQuery(function(client) {
                client.query(query, [userReplicationConnections.join(':-:')],
                             function(err) {
                                 if (err) {
                                     errors.log(err);
                                 }
                             });
            });
        }
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

    function hourly()
    {
        if (hourlyRunning) {
            return;
        }

        hourlyRunning = true;

        app.db.dbQuery(function(client) {
            client.query("select ct_hourlyMaintenance()", [],
                function(err) {
                    if (err) {
                        errors.log(err);
                    }

                    hourlyRunning = false;
                    setTimeout(hourly, hourlyPeriod);
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
        hourly();
        daily();
    }

    return Janitor;
})();

module.exports.Janitor = Janitor;

