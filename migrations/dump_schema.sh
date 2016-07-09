#!/bin/bash
pg_dump -Osxn public hylo | sed -e 's/; Tablespace: $//'
