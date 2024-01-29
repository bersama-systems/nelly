#!/bin/sh
account=$1
#curl -H "AuthApp-AccountId: $account" -H "AuthApp-SessionId: lolsecurity" http://localhost:3000/users
curl -H "AuthApp-AccountId: $account" -H "AuthApp-SessionId: lolsecurity" http://127.0.0.1:3000/users
