FROM php:8.2-fpm-alpine

# Install nginx and required PHP extensions
RUN apk add --no-cache nginx mysql-client \
    && docker-php-ext-install mysqli pdo pdo_mysql

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy application files
COPY . /var/www/html/

# Set permissions
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

# Expose port 80
EXPOSE 80

# Start script
COPY start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]
