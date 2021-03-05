# Container image that runs your code
FROM swaggerapi/swagger-editor
ENV SWAGGER_FILE=examples/openapi-3-0-1.yaml

RUN apk update && apk add nodejs nodejs-npm chromium
RUN npm i puppeteer --no-save

# Copies your code file from your action repository to the filesystem path `/` of the container
COPY entrypoint.sh /entrypoint.sh
COPY index.js /index.js

# Code file to execute when the docker container starts up (`entrypoint.sh`)
ENTRYPOINT ["/entrypoint.sh"]