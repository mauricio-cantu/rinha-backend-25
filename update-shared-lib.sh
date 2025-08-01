#!/bin/bash
projects=("healthcheck-worker" "payment-api" "payment-worker")
for project in "${projects[@]}"
do
  rm -rf "$project/shared-lib"
  cp -r shared-lib "$project"
done
