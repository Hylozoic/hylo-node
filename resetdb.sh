#!/bin/bash
dropdb hylo -h localhost
createdb hylo -h localhost -O ubuntu
cat migrations/schema.sql | psql hylo
psql -U ubuntu -d hylo -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ubuntu"
psql -U ubuntu -d hylo -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ubuntu"
./node_modules/.bin/knex seed:run
nvm use
nf -j Procfile.dev -p 8080 start -t 1000