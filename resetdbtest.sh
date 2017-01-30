#!/bin/bash
dropdb hylo_test -h localhost
createdb hylo_test -h localhost -O ubuntu
cat migrations/schema.sql | psql hylo_test
psql -U ubuntu -d hylo_test -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ubuntu"
psql -U ubuntu -d hylo_test -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ubuntu"
nvm use 6.2.2
npm run test