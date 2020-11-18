FROM geographica/gdal2:2.4.0

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get -y install curl
RUN curl -sL https://deb.nodesource.com/setup_14.x  | bash -

RUN apt-get update && apt-get -y install git build-essential libsqlite3-dev zlib1g-dev awscli gnupg jq nodejs unzip zip

WORKDIR /home/app
COPY . /home/app

CMD npm run built-prod
