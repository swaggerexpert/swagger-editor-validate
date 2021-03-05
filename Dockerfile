# Container image that runs your code
FROM swaggerapi/swagger-editor

# Copies your code file from your action repository to the filesystem path `/` of the container
COPY entrypoint.sh /entrypoint.sh
COPY index.js /index.js

# Code file to execute when the docker container starts up (`entrypoint.js`)
ENTRYPOINT ["/entrypoint.js"]