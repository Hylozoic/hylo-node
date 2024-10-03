FROM node:buster

RUN apt-get update && apt-get install -y postgresql-client
COPY ./init-db.sh /root/init-db.sh

WORKDIR /root
CMD ./init-db.sh
