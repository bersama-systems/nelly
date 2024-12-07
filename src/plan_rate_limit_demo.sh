redis-cli FLUSHALL
cat limits.json | redis-cli -x SET nelly_configuration
pid=`docker exec src-nginx-1 cat /usr/local/openresty/nginx/logs/nginx.pid`
docker exec src-nginx-1 /bin/kill -HUP $pid

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

echo "Ran $successful_requests requests!"