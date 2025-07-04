# https://openresty.org/en
# OpenResty® is a dynamic web platform based on NGINX and LuaJIT.
FROM openresty/openresty:latest

# Copy NGINX configuration file and Lua script
COPY nginx.conf /usr/local/openresty/nginx/conf/nginx.conf
COPY rate_limit.lua /usr/local/openresty/lualib/rate_limit.lua
RUN mkdir -p /var/log/nginx
RUN apt-get update
RUN apt-get install -y procps
# Expose port 80
EXPOSE 80
EXPOSE 3000
EXPOSE 3008
# Command to run OpenResty
CMD ["/usr/local/openresty/bin/openresty", "-g", "daemon off;"]
