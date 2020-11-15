FROM geographica/gdal2:2.4.0

ENV DEBIAN_FRONTEND=noninteractive
ENV INITRD No
ENV LANG en_US.UTF-8
ENV GOVERSION 1.15
ENV GOROOT /opt/go
ENV GOPATH /root/.go

RUN apt-get update && apt-get -y install curl
RUN curl -sL https://deb.nodesource.com/setup_14.x  | bash -

RUN apt-get update && apt-get -y install git build-essential libsqlite3-dev zlib1g-dev awscli gnupg jq nodejs unzip

WORKDIR /home/app
COPY . /home/app

RUN npm install

CMD npm run built-prod
