# Gettig started

Clone the repository and run ```npm install --legacy-peer-deps```.

Then run ```npm run build -- default```

(The default theme is configured to run with an existing backend, 
that may or may not be online at the time you try this. Best use your own backend;
see https://github.com/InfoCompass/backend)

This will build the default theme into the dev folder. 
Serve the files from this folder with your favourite web server.
In order for things to work properly you have to configure your web server
such that everything that is not an asset
is redirected to index.html (that's an old angularJs thing):

``` apache
# If the requested resource doesn't exist, use index.html
RewriteRule ^ /index.html
```


You can try all the other themes from https://github.com/orgs/InfoCompass/repositories 
if you like, they're configured to use their
respective backends and should work out of the box. To do that, pull one of the
custom-* repositories into the custom folder; for example:

```
$ cd custom
$ git pull https://github.com/InfoCompass/custom-pa.git
$ cd ..
$ npm run build -- pa dist
```

This should build the theme into build/dist. Notice the second parameter from the
build script (here 'dist'): If it is present the theme will be build into the respective
sub folder of /build; if not, it will go to dev.


# Docker Setup

## Prerequisites
* [docker](https://docs.docker.com/get-docker/)
* [docker-compose](https://docs.docker.com/compose/install/)


## User guide

### Step-1 Review the .env file and select the Theme

* The .env by default is pointing to the remote backend hosted in production environment.

```shell
FRONTEND_URL="https://www.info-compass.net"
BACKEND_URL="https://api.info-compass.net"
STATS_URL="https://stats.info-compass.net"
PUBLIC_ITEMS_URL="https://public.info-compass.net/items"
```

PS: For more details please contact the dev teams regarding these env-vars.
It's always possible to update the values and using for example local backend or another remote domains.


* Infocompass-client has diffrent themes and most of them are hosted in different repositories.
For more details, please checkout infocompass workspace [infocompass](https://github.com/InfoCompass)

List of supported themes:
| Themes      |
| ----------- |
| default      |
| customer-awo   |
| customer-at   |
| customer-pa   |
| customer-icb   |
| customer-mv   |


PS: There is a default theme included in the client repository.

Please note that some themes might have issues or requires more refactoring to support configuration via env-vars!

### Step-2 Build locally and test the client with docker-compose

For the default theme:

```shell
# --build option is to skip cache usage
# you can append -d daemon mode to run the containers in the background
docker-compose up --build
```

Custom Theme:

```shell
THEME="custom-awo"  docker-compose up --build # example custom-awo
THEME="custom-at"  docker-compose up --build # example custom-pa
```

PS: By default the client is accessible from localhost.
Feel free to adjust docker-compose file or create new ones in case you would like to use different ports
and run multiple instances/themes at the same environment.

### Clean up
```shell
# The down cmd stops containers and removes containers,
# networks, volumes, and images created by up
docker-compose down
```

# CI/CD Pipelines
At the moment we are using community github-actions for building and pushing
docker images to docker-hub repository [infocompass](https://hub.docker.com/u/infocompassde)

## Prerequisites
These secrets must be configured at the organization level or the repository itself:

| Themes      | Value |
| ----------- | ----------- |
|DOCKERHUB_USERNAME | infocompass |
|DOCKERHUB_TOKEN | #To get from dockerhub account admin |

## User guide

The pipelines has two running modes:

* Default mode: to build and ship the default theme docker image (automatically triggered once merged to the master branch)

* Manual mode: in which the user provide the custom theme before the execution
of the pipelines (Manually triggered)

The docker images tagging will be a combination of the theme name and the git revision number.