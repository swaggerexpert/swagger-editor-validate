# Container image that runs your code
FROM swaggerapi/swagger-editor

# Install node.js
RUN sudo apt-get install -y nodejs

# Copies your code file from your action repository to the filesystem path `/` of the container
COPY entrypoint.sh /entrypoint.sh
COPY index.js /index.js

# Code file to execute when the docker container starts up (`entrypoint.sh`)
ENTRYPOINT ["/entrypoint.sh"]