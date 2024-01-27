#!/bin/sh

email=$1
password=$2

curl -H "AuthApp-SessionId: lolsecurity"  -H "Content-Type: application/json" -X POST -d "{\"user\": {\"email\": \"$email\", \"password\": \"$password\"}}"  http://localhost:3000/users