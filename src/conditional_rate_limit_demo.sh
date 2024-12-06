cat conditional_limits.json | redis-cli -x SET nelly_conditional_limits
pid=`docker exec src-nginx-1 cat /usr/local/openresty/nginx/logs/nginx.pid`
docker exec src-nginx-1 /bin/kill -HUP $pid
echo "You can now exedute curl --header \"x-account-plan: 1\" --header \"x-account-id: 69420\"  http://localhost/api/example"
