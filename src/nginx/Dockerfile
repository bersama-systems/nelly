# Use OpenResty base image
FROM openresty/openresty:latest

# Copy NGINX configuration file and Lua script
COPY nginx.conf /usr/local/openresty/nginx/conf/nginx.conf
COPY rate_limit.lua /usr/local/openresty/lualib/rate_limit.lua
COPY nelly_configuration.lua /usr/local/openresty/lualib/nelly_configuration.lua
COPY limits.json /usr/local/openresty/nginx/conf/limits.json
# Expose port 80
EXPOSE 80

# Command to run OpenResty
CMD ["/usr/local/openresty/bin/openresty", "-g", "daemon off;"]
