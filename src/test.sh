#!/bin/bash

# Start docker via docker-compose.

./start.sh

# Ensure the system is up and running by polling our server for a single result

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

echo "NodeJS app and openresty responding and warmed up..... starting tests"

echo "Testing massive GETS on /api/example"

echo "Testing lower plan limit GETS"
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
echo "Testing upper plan limit GETS"
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
echo "Got off $successful_requests requests for upper plan limit GET"


echo "Testing massive PUTS on /api/example/1"

echo "Testing lower plan limit PUTS"
successful_requests=0
account_id=$RANDOM
for i in {1..100}
do
  value="$RANDOM foo"
  response=$(curl -X PUT -H "Content-Type: application/json" -d "{\"project\":\"$value\"}" --header "x-account-plan: 0" --header "x-account-id: $account_id" --write-out '%{http_code}' --silent --output /dev/null http://localhost/api/example/1)

  if [ "$response" -eq 429 ]; then
    break
  fi

  successful_requests=$((successful_requests+1))

  if [ "$i" -gt 1 ];
  then
    echo "Rate limiting failed!!! $i"
    exit -127
  fi
done

echo "Got off $successful_requests requests for lower plan limit PUTS"
echo "Testing upper plan limit PUTS"
successful_requests=0
account_id=$RANDOM
for i in {1..365}
do
  value="$RANDOM foo"
  response=$(curl -X PUT -H "Content-Type: application/json" -d "{\"project\":\"$value\"}" --header "x-account-plan: 1" --header "x-account-id: $account_id" --write-out '%{http_code}' --silent --output /dev/null http://localhost/api/example/1)
  if [ "$response" -eq 429 ]; then
    break
  fi
  successful_requests=$((successful_requests+1))
  if [ "$i" -gt 5 ];
  then
    echo "Rate limiting failed!!!"
    exit -127
  fi
done
echo "Got off $successful_requests requests for upper plan limit PUTS"



echo "Testing massive GETS on /api/example/composite_condition"

echo "Testing lower plan limit GETS for composite condition"
successful_requests=0
account_id=$RANDOM
for i in {1..100}
do
  response=$(curl --header "x-account-plan: 0" --header "x-account-id: $account_id" --write-out '%{http_code}' --silent --output /dev/null http://localhost/api/example/composite_condition)

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

echo "Got off $successful_requests requests for lower plan limit on composite condition"
echo "Testing upper plan limit GETS for composite condition"
successful_requests=0
account_id=$RANDOM
for i in {1..365}
do
  response=$(curl --header "x-account-plan: 1" --header "x-account-id: $account_id" --write-out '%{http_code}' --silent --output /dev/null http://localhost/api/example/composite_condition)
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
echo "Got off $successful_requests requests for upper plan limit GET for composite_condition"


echo "Testing upper plan limit GETS for composite condition"
successful_requests=0
account_id=$RANDOM
for i in {1..365}
do
  response=$(curl --header "x-account-plan: 99" --header "x-account-id: $account_id" --write-out '%{http_code}' --silent --output /dev/null http://localhost/api/example/composite_condition)
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
echo "Got off $successful_requests requests for upper plan limit GET for composite_condition"

echo "*****Suite success!!!*****"