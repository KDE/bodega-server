#!/bin/sh
case "$1" in
    "production" ) forever start -a -l bodega-production.log -o bodega-out-production.log -e bodega-error-production.log app.js --production&;;
               * ) node app.js;;
esac
