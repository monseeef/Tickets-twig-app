# Use official PHP image
FROM php:8.2-cli

# Install Composer
RUN apt-get update && apt-get install -y unzip git curl \
    && curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Set working directory
WORKDIR /app

# Copy all files into the container
COPY . .

# Install PHP dependencies
RUN composer install

# Expose the port (Render expects port 10000)
EXPOSE 10000

# Start PHP's built-in web server serving the /public folder
CMD ["php", "-S", "0.0.0.0:10000", "-t", "public"]
