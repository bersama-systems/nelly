#!/bin/sh

id=$1
password=$2
account=$3

echo $account
curl -H "AuthApp-AccountId: $account" -H "AuthApp-SessionId: lolsecurity"  -H "Content-Type: application/json" -X POST -d "{\"user\": {\"password\": \"$password\"}}"  http://localhost:3000/users/$id