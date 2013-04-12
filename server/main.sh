#!/bin/sh
case "$1" in
    "production" ) NODE_ENV=production forever start app.js -l bodega.log -o bodega-out.log -e bodega-error.log -w &;;
               * ) NODE_ENV=test node app.js;;
esac
