#!/bin/bash

# Ensure the system is up and running

response=""
var=0

 response=$(curl --header "x-account-plan: 0" --header "x-account-id: 1" --write-out '%{http_code}' --silent --output /dev/null http://localhost/api/example)

while [ "$response" != 200 ] && [ "$var" -le 10 ];
do
  sleep 1
  var=$((var+1))
  response=$(curl --header "x-account-plan: 0" --header "x-account-id: 1" --write-out '%{http_code}' --silent --output /dev/null http://localhost/api/example)
done


if [ "$response" -ne 200 ]; then
  echo "could not warm up the system"
  exit -127
fi

echo "NodeJS app responding and warmed up..... starting tests"

echo "Testing massive GETS on /api/example"

echo "Testing lower plan limit"
successful_requests=0
account_id=$RANDOM
for i in {1..100}
do
  response=$(curl --header "x-account-plan: 0" --header "x-account-id: $account_id" --write-out '%{http_code}' --silent --output /dev/null http://localhost/api/example)

  if [ "$response" -eq 429 ]; then
    break
  fi

  successful_requests=$((successful_requests+1))

  if [ "$i" -gt 60 ];
  then
    echo "Rate limiting failed!!! $i"
    exit -127
  fi
done

echo "Got off $successful_requests requests for lower plan limit"
echo "Testing upper plan limit"
successful_requests=0
account_id=$RANDOM
for i in {1..365}
do
  response=$(curl --header "x-account-plan: 1" --header "x-account-id: $account_id" --write-out '%{http_code}' --silent --output /dev/null http://localhost/api/example)
  if [ "$response" -eq 429 ]; then
    break
  fi
  successful_requests=$((successful_requests+1))
  if [ "$i" -gt 300 ];
  then
    echo "Rate limiting failed!!!"
    exit -127
  fi
done
echo "Got off $successful_requests requests for upper plan limit"

echo "*****Suite success!!!*****"