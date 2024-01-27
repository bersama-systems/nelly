#!/bin/sh
account=$1
curl -H "AuthApp-AccountId: $account" -H "AuthApp-SessionId: lolsecurity" http://localhost:3000/users