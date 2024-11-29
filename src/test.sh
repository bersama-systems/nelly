#!/bin/bash

# Start docker via docker-compose.

if [ $1 = "clean" ]; then
  ./clean_nginx.sh
fi

./start.sh

# Ensure the system is up and running by polling our server for a single result

response=""
var=0
account_id=$RANDOM
response=$(curl --header "x-account-plan: 0"  --header "x-account-id: $account_id" --write-out '%{http_code}' --silent --output /dev/null http://localhost/api/uncovered_product_limit)

while [ "$response" != 200 ] && [ "$var" -le 10 ];
do
  sleep 1
  var=$((var+1))
  response=$(curl --header "x-account-plan: 0"  --header "x-account-id: $account_id" --write-out '%{http_code}' --silent --output /dev/null http://localhost/api/uncovered_product_limit)
done

if [ "$response" -ne 200 ]; then
  echo "could not warm up the system"
  exit -127
fi

echo "NodeJS app and openresty responding and warmed up..... starting tests"

echo "Testing Plan limits on uncovered product limits"
echo "Testing support lower plan limit GETS"
successful_requests=0
account_id=$RANDOM
for i in {1..50}
do
  response=$(curl --header "x-account-plan: 0" --header "x-account-id: $account_id" --write-out '%{http_code}' --silent --output /dev/null http://localhost/api/uncovered_product_limit)

  if [ "$response" -eq 429 ]; then
    break
  fi

  successful_requests=$((successful_requests+1))

  if [ "$i" -gt 5 ];
  then
    echo "Rate limiting failed!!! $i"
    exit -127
  fi
done

if [ "$successful_requests" -gt 5 ];
  then
    echo "Unknown plan Rate limiting failed!!! $i"
    exit -127
fi

echo "Testing higher plan limit GETS"
successful_requests=0
account_id=$RANDOM
for i in {1..500}
do
  response=$(curl --header "x-account-plan: 1" --header "x-account-id: $account_id" --write-out '%{http_code}' --silent --output /dev/null http://localhost/api/uncovered_product_limit)

  if [ "$response" -eq 429 ]; then
    break
  fi

  successful_requests=$((successful_requests+1))

  if [ "$i" -gt 300 ];
  then
    echo "Higher Rate limiting failed!!! $i"
    exit -127
  fi
done

if [ "$successful_requests" -gt 300 ];
  then
    echo "Higher Rate limiting failed!!! $i"
    exit -127
fi

echo "Testing blanket lower plan limit GETS"
successful_requests=0
account_id=$RANDOM
for i in {1..50}
do
  response=$(curl --header "x-account-plan: 0" --header "x-account-id: $account_id" --write-out '%{http_code}' --silent --output /dev/null http://localhost/foo)

  if [ "$response" -eq 429 ]; then
    break
  fi

  successful_requests=$((successful_requests+1))

  if [ "$i" -gt 4 ];
  then
    echo "Rate limiting failed!!! $i"
    exit -127
  fi
done

if [ "$successful_requests" -gt 4 ];
  then
    echo "blanket plan Rate limiting failed!!! $i"
    exit -127
fi

echo "Testing higher blanket plan limit GETS"
successful_requests=0
account_id=$RANDOM
for i in {1..500}
do
  response=$(curl --header "x-account-plan: 1" --header "x-account-id: $account_id" --write-out '%{http_code}' --silent --output /dev/null http://localhost/foo)

  if [ "$response" -eq 429 ]; then
    break
  fi

  successful_requests=$((successful_requests+1))

  if [ "$i" -gt 100 ];
  then
    echo "Higher Rate limiting failed!!! $i"
    exit -127
  fi
done

if [ "$successful_requests" -gt 100 ];
  then
    echo "Higher Rate limiting failed!!! $i"
    exit -127
fi

echo "Testing massive GETS on /api/example"

echo "Testing lower plan limit GETS"
successful_requests=0
account_id=$RANDOM
for i in {1..1000}
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


echo "Testing lower plan limit GETS with random query string"
successful_requests=0
account_id=$RANDOM
for i in {1..1000}
do
  response=$(curl --header "x-account-plan: 0" --header "x-account-id: $account_id" --write-out '%{http_code}' --silent --output /dev/null "http://localhost/api/example?account_id=$account_id")

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

echo "Got off $successful_requests requests for lower plan limit with random query string"

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
  if [ "$i" -gt 200 ];
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
  if [ "$i" -gt 200 ];
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
  if [ "$i" -gt 200 ];
  then
    echo "Rate limiting failed!!!"
    exit -127
  fi
done
echo "Got off $successful_requests requests for upper plan limit GET for composite_condition"

echo "Testing upper plan limit PUTS for composite condition and wildcard verb"
successful_requests=0
account_id=$RANDOM
for i in {1..365}
do
  response=$(curl -X PUT --header "x-account-plan: 99" --header "x-account-id: $account_id" --write-out '%{http_code}' --silent --output /dev/null http://localhost/api/example/wildcard_verb)
  if [ "$response" -eq 429 ]; then
    break
  fi
  successful_requests=$((successful_requests+1))
  if [ "$i" -gt 200 ];
  then
    echo "Rate limiting failed!!!"
    exit -127
  fi
done
echo "Got off $successful_requests requests for upper plan limit GET for composite_condition"

echo "Testing second upper plan limit GETS for composite condition and wildcard verb"
successful_requests=0
account_id=$RANDOM
for i in {1..365}
do
  response=$(curl --header "x-account-plan: 1" --header "x-account-id: $account_id" --write-out '%{http_code}' --silent --output /dev/null http://localhost/api/wildcard_verb)
  if [ "$response" -eq 429 ]; then
    break
  fi
  successful_requests=$((successful_requests+1))
  if [ "$i" -gt 200 ];
  then
    echo "Rate limiting failed!!! $i"
    exit -127
  fi
done
echo "Got off $successful_requests requests for upper plan limit GET for composite_condition"


echo "Testing second upper plan limit GETS for composite condition and wildcard verb"
successful_requests=0
account_id=$RANDOM
for i in {1..365}
do
  response=$(curl --header "x-account-plan: 1" --header "x-account-id: $account_id" --write-out '%{http_code}' --silent --output /dev/null http://localhost/api/wildcard_verb)
  if [ "$response" -eq 429 ]; then
    break
  fi
  successful_requests=$((successful_requests+1))
  if [ "$i" -gt 200 ];
  then
    echo "Rate limiting failed!!!"
    exit -127
  fi
done
echo "Got off $successful_requests requests for upper plan limit GET for composite_condition"

echo "Testing fallback plan limit GETS for composite condition and wildcard verb"
successful_requests=0
account_id=$RANDOM
for i in {1..365}
do
  response=$(curl --header "x-account-plan: 12" --header "x-account-id: $account_id" --write-out '%{http_code}' --silent --output /dev/null http://localhost/api/wildcard_verb)
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
if [ "$successful_requests" -gt 5 ];
  then
    echo "More constrictive Account Rate limiting failed!!! $$successful_requests"
    exit -127
fi
echo "Got off $successful_requests requests for upper plan limit GET for composite_condition"

echo "*****Suite success!!!*****"