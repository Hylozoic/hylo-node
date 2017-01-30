#!/bin/bash
sudo service postgresql start
sudo service redis-server start
nf -j Procfile.dev -p 8080 start -t 1000