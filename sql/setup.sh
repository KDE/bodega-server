#!/bin/sh
dropdb bodega
createdb -O bodega bodega
psql -d bodega -U bodega -f bodega.sql 1>/dev/null
psql -d bodega -U bodega -f core.plsql 1>/dev/null
psql -d bodega -U bodega -f search_en.plsql 1>/dev/null
psql -d bodega -U bodega -f defaultdata.sql 1>/dev/null
psql -d bodega -U bodega -f actionconf.plsql 1>/dev/null
psql -d bodega -U bodega -f rankings.sql 1>/dev/null
psql -d bodega -U bodega -f purchasing.plsql 1>/dev/null
psql -d bodega -U bodega -f payments_stripe.sql 1>/dev/null
psql -d bodega -U bodega -f vivaldi.sql 1>/dev/null
