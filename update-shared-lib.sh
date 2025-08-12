#!/bin/bash
projects=("payment-api")
for project in "${projects[@]}"
do
  rm -rf "$project/shared-lib"
  cp -r shared-lib "$project"
done
