redis-cli FLUSHALL
cat limits.json | redis-cli -x SET nelly_configuration
pid=`docker exec src-nginx-1 cat /usr/local/openresty/nginx/logs/nginx.pid`
docker exec src-nginx-1 /bin/kill -HUP $pid

echo "Testing lower plan limit PUTS"
successful_requests=0
account_id=$RANDOM
for i in {1..100}
do
  value="$RANDOM foo"
  response=$(curl -X PUT -H "Content-Type: application/json" -d "{\"project\":\"$value\"}" --header "x-account-plan: 1" --header "x-account-id: $account_id" --write-out '%{http_code}' --silent --output /dev/null http://localhost/api/example/1)

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

echo "Got off $successful_requests requests for lower plan limit PUTS"