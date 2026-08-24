# -----------------------------------------------------------------------------
# Stage 0: Composer dependencies (vendor) — frontend build-এর জন্যও দরকার
# -----------------------------------------------------------------------------
FROM php:8.4-cli-alpine AS vendor
WORKDIR /var/www

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

COPY composer.json composer.lock ./

# --no-scripts: package:discover পুরো app boot করে, source ছাড়া সেটা চলবে না
# (Laravel পরে frontend stage-এ manifest নিজেই তৈরি করে নেয়)
RUN composer install \
    --no-dev \
    --no-scripts \
    --prefer-dist \
    --ignore-platform-reqs \
    --no-interaction

# -----------------------------------------------------------------------------
# Stage 1: Build Frontend Assets — PHP লাগবে কারণ wayfinder vite plugin
# build চলার সময় `php artisan wayfinder:generate` চালায়
# -----------------------------------------------------------------------------
FROM php:8.4-cli-alpine AS frontend
WORKDIR /var/www

# Node.js ও npm ইনস্টল
RUN apk add --no-cache nodejs npm

ENV NODE_OPTIONS="--max-old-space-size=4096"

# Package files কপি করা
COPY package.json package-lock.json ./

# Clean install — devDependencies অবশ্যই দরকার (NODE_ENV=production থাকলে npm ci এগুলো বাদ দেয়)
RUN npm ci --include=dev

# vendor + source code কপি করা
COPY --from=vendor /var/www/vendor ./vendor
COPY . .

# Laravel console boot করার জন্য storage structure দরকার
RUN mkdir -p storage/framework/views storage/framework/sessions storage/framework/cache bootstrap/cache

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

# Local dev-এর তৈরি stale manifest মুছে ফেলা — এতে dev-only provider (যেমন Laravel\Boost) থাকে
# যা production image-এ নেই, ফলে package:discover fail করে
RUN rm -f bootstrap/cache/packages.php bootstrap/cache/services.php

# Stage 1 থেকে তৈরি হওয়া compiled assets copy করা
COPY --from=frontend --chown=www-data:www-data /var/www/public/build /var/www/public/build

# Dump Autoload
RUN composer dump-autoload --optimize --no-dev --classmap-authoritative

# Permissions Setup
RUN mkdir -p /var/www/storage/framework/views \
    /var/www/storage/framework/sessions \
    /var/www/storage/framework/cache

RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache
RUN chmod -R 775 /var/www/storage /var/www/bootstrap/cache

EXPOSE 80

CMD ["php-fpm"]