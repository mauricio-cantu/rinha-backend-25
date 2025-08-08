#!/bin/bash
set -e

DOCKER_USER="mauriciocantu"
VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Informe a versao"
  exit 1
fi

echo "Publicando imagens com versão $VERSION"
docker login

echo "Buildando payment-api..."
docker build -t $DOCKER_USER/payment-api:$VERSION ./payment-api
docker tag $DOCKER_USER/payment-api:$VERSION $DOCKER_USER/payment-api:latest
docker push $DOCKER_USER/payment-api:$VERSION
docker push $DOCKER_USER/payment-api:latest

echo "Buildando payment-worker..."
docker build -t $DOCKER_USER/payment-worker:$VERSION ./payment-worker
docker tag $DOCKER_USER/payment-worker:$VERSION $DOCKER_USER/payment-worker:latest
docker push $DOCKER_USER/payment-worker:$VERSION
docker push $DOCKER_USER/payment-worker:latest

echo "Imagens publicadas"
