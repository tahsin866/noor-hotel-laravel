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

# Copy Composer files first to avoid caching issues
COPY composer.json composer.lock ./

# Install Dependencies (Ignoring platform reqs if lock mismatch persists)
RUN composer install --no-dev --optimize-autoloader --ignore-platform-reqs

# Copy full application
COPY . .

# Permissions
RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache

EXPOSE 80
CMD ["php-fpm"]