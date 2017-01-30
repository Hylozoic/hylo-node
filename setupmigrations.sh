#!/bin/bash
psql -U ubuntu -d hylo -c "TRUNCATE knex_migrations"
psql -U ubuntu -d hylo -c "TRUNCATE knex_migrations_lock"