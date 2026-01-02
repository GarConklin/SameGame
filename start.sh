#!/bin/sh

# Start PHP-FPM
php-fpm -D

# Start nginx
nginx -g 'daemon off;'

