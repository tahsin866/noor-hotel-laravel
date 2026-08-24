# -----------------------------------------------------------------------------
# Stage 1: Build Frontend Assets with Node
# -----------------------------------------------------------------------------
FROM node:20-alpine AS frontend
WORKDIR /var/www

# Package files কপি করে NPM install করা
COPY package.json package-lock.json ./
RUN npm ci

# Source code কপি করে asset build করা
COPY . .
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Application Runner (PHP-FPM)
# -----------------------------------------------------------------------------
FROM php:8.4-fpm-alpine

# System Dependencies
RUN apk add --no-cache \
    zip unzip curl libpng-dev libjpeg-turbo-dev freetype-dev \
    oniguruma-dev libxml2-dev postgresql-dev nginx supervisor

# PHP Extensions
RUN docker-php-ext-install pdo pdo_mysql pdo_pgsql pgsql mbstring exif pcntl bcmath gd

# Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

# Copy Composer files
COPY composer.json composer.lock ./

RUN composer install \
    --no-dev \
    --no-scripts \
    --no-autoloader \
    --prefer-dist \
    --ignore-platform-reqs

# Copy full application code
COPY --chown=www-data:www-data . /var/www

# Stage 1 থেকে বিল্ড হওয়া compiled assets (public/build) কপি করা
COPY --from=frontend --chown=www-data:www-data /var/www/public/build /var/www/public/build

# Dump Autoload
RUN composer dump-autoload --optimize --no-dev --classmap-authoritative

# Ensure storage structure & permissions
RUN mkdir -p /var/www/storage/framework/views \
    /var/www/storage/framework/sessions \
    /var/www/storage/framework/cache

RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache
RUN chmod -R 775 /var/www/storage /var/www/bootstrap/cache

EXPOSE 80

CMD ["php-fpm"]