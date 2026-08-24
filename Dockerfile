FROM php:8.4-fpm-alpine

# System Dependencies
RUN apk add --no-cache \
    zip unzip curl libpng-dev libjpeg-turbo-dev freetype-dev \
    oniguruma-dev libxml2-dev postgresql-dev nginx supervisor

# PHP Extensions
RUN docker-php-ext-install pdo pdo_mysql mbstring exif pcntl bcmath gd

# Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

# Copy Composer files first
COPY composer.json composer.lock ./

# Install Dependencies without running laravel scripts
RUN composer install --no-dev --no-scripts --no-autoloader --ignore-platform-reqs

# Copy full application code
COPY . .
COPY --chown=www-data:www-data . /var/www
# Generate optimized autoloader and run post-install scripts
RUN composer dump-autoload --optimize --no-dev --classmap-authoritative

# Set directory permissions
RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache
RUN apt-get update && apt-get install -y libpq-dev \
    && docker-php-ext-install pdo pdo_pgsql pgsql


EXPOSE 80
CMD ["php-fpm"]