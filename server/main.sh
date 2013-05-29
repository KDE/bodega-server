#!/bin/sh
case "$1" in
    "production" ) forever start -aw -l bodega.log -o bodega-out.log -e bodega-error.log app.js --production&;;
               * ) node app.js;;
esac
