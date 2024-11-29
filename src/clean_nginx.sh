echo "running cleanup!!!"
docker stop src-nginx-1
docker rm src-nginx-1
docker rmi src-nginx

docker stop src-nodejs-1
docker rm src-nodejs-1
docker rmi src-nodejs