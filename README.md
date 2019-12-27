# GraphQL Schema review action  

This is a companion app for the GraphQL Schema review app. See https://www.graphql-consulting.com/schema-review for details.

The app must be installed in order to use this actions. 

## How to use it

This actions builds and runs a Docker container which is expected to expose a GraphQL server at `/graphql`. This server is used to introspect the schema which is then reviewed. 

Example config:

```yaml
name: Review schema
on: [pull_request]

jobs:
  schema-review:
    runs-on: ubuntu-latest
    name: review schema
    steps:
    - uses: actions/checkout@v1
    - name: Push schema 
      id: push-schema
      uses: graphql-consulting/schema-review-action@v1
      with:
        container-port: '4000'
        dockerfile-path: '.'

```


## Config options

`container-port`: the port exposed inside the container

`dockerfile-path`: the path to the Dockerfile. Default is `'.'`.



