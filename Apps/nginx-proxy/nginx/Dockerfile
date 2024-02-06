# Use an official Nginx image as a base
FROM nginx:alpine

# Copy the HTML files to the container's /usr/share/nginx/html directory
COPY ./html /usr/share/nginx/html

# Set the working directory in the container to /usr/share/nginx/html
WORKDIR /usr/share/nginx/html

# Expose port 80 for incoming HTTP connections
EXPOSE 80

# Start Nginx when the container starts
CMD ["nginx", "-g", "daemon off;"]
