# Running hylo-node in docker with VSCode

Rather than running your own local Postgres and Redis servers, you can run
hylo-node in a docker container that uses docker-compose to start a local
instance of Postgres and Redis. VSCode can manage this process fairly
transparently.

To learn about managing a dev environment with VSCode Remote Container, read
this tutorial: https://code.visualstudio.com/docs/remote/containers-tutorial

When you have the `Remote - Containers` extension installed, simply open this
repository in VSCode and select the `Reopen in container` option when it pops
up. From there, `yarn run dev` should work immediately.


# Running backend services via Docker

Contributors who do not use VSCode may still wish to run the backend services
via Docker to simplify configuration. You may do this by running the following
command from the repo root:

    docker-compose -f .devcontainer/docker-compose.servicesonly.yml up

Once the DB & Redis are active, you can boot the Hylo web app with the usual
`npm run dev` command.

Note that this requires a minimum of Docker Compose v1.27 in order to run.


# Initializing the database

```
export PGPASSWORD=postgres
createdb hylo -U postgres -h db
createdb hylo_test -U postgres -h db
cat migrations/schema.sql | psql -U postgres -h db hylo
./node_modules/.bin/knex seed:run
```


# Configuring .env

You can begin by copying `.env.example` to `.env`. These values allow the server
to talk to the Postgres and Redis servers running alongside hylo-node. The
example file contains invalid values for OAuth clients (e.g. Google and
Facebook), so be sure to fill in real values if you plan to use those
integrations.
