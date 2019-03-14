#!/bin/bash
# Working for Postgres 11
pg_dump -Osx hylo | sed -e 's/; Tablespace: $//'
# Previously knowing working with Postgres 9.4
# pg_dump -Osxn public hylo | sed -e 's/; Tablespace: $//'
