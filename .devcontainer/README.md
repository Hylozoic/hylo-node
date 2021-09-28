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

*(All commands given relative to the `.devcontainer` folder.)*

1. Postgres will already be running if you are using the VSCode container integration. If you manage the containers yourself, ensure they are online:  
   `docker-compose -f docker-compose.servicesonly.yml up`
2. Run the seed script against the DB container:
    1. Change your `.env` file to set `DATABASE_URL=postgres://postgres:postgres@db:5432/hylo` so that the seed container can resolve to the correct host.
    2. Run `docker-compose -f docker-compose.seed.yml up`. The script should terminate with a 0 exit code.
    3. Restore your `DATABASE_URL` to the appropriate URI to be resolved by the Hylo node backend in your setup. (If running the node service locally or in VSCode, this should be `localhost`.)

> (\*In a VSCode configuration you may be able to run the `init-db.sh` command directly within the VSCode terminal, but YMMV.)


# Configuring .env

You can begin by copying `.env.example` to `.env`. These values allow the server
to talk to the Postgres and Redis servers running alongside hylo-node. The
example file contains invalid values for OAuth clients (e.g. Google and
Facebook), so be sure to fill in real values if you plan to use those
integrations.

If you have an existing configuration, the two configuration parameters to pay
attention to are:

    DATABASE_URL=postgres://postgres:postgres@localhost:5432/hylo
    REDIS_URL=redis://localhost:6379
