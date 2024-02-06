#!/bin/bash

docker-compose -f authApp/docker-compose.yml up -d

docker-compose -f nginx-proxy/docker-compose.yml up -d
