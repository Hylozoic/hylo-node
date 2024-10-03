#!/usr/bin/env bash

export PGPASSWORD=postgres
createdb hylo -U postgres -h db
createdb hylo_test -U postgres -h db

cd /seed
cat migrations/schema.sql | psql -U postgres -h db hylo
./node_modules/.bin/knex seed:run
