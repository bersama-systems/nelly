cat account_id_network_allowlist.json | redis-cli -x SET account_id_network_allowlist
pid=`docker exec src-nginx-1 cat /usr/local/openresty/nginx/logs/nginx.pid`
docker exec src-nginx-1 /bin/kill -HUP $pid
echo "You can now execute curl --header \"x-account-plan: 1\" --header \"x-account-id: 6\"  http://localhost/api/example"
