#!/bin/sh
case "$1" in
    "production" ) forever start -a -l bodega-production.log -o bodega-out-production.log -e bodega-error-production.log app.js --production&;;
    "staging" ) forever start -a -l bodega-test.log -o bodega-out-test.log -e bodega-error-test.log app.js --test&;;
    * ) node app.js;;
esac
