

FROM php:8.2-fpm-alpine

RUN apk add --no-linux-headers --no-cache \
    zip unzip curl libpng-dev libjpeg-turbo-dev freetype-dev \
    oniguruma-dev libxml2-dev postgresql-dev nginx supervisor

RUN docker-php-ext-install pdo pdo_mysql mbstring exif pcntl bcmath gd

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www
COPY . .

RUN composer install --no-dev --optimize-autoloader
RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache

EXPOSE 80
CMD ["php-fpm"]


# FROM php:8.4-fpm

# # Install system dependencies
# RUN apt-get update && apt-get install -y \
#     git \
#     curl \
#     libpng-dev \
#     libonig-dev \
#     libxml2-dev \
#     libpq-dev \
#     libzip-dev \
#     zip \
#     unzip \
#     nodejs \
#     npm \
#     && docker-php-ext-install pdo_pgsql mbstring exif pcntl bcmath gd zip \
#     && pecl install redis \
#     && docker-php-ext-enable redis \
#     && apt-get clean && rm -rf /var/lib/apt/lists/*

# # Install Composer
# COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# # Set working directory
# WORKDIR /var/www

# # Copy existing application directory contents
# COPY . /var/www

# # Copy existing application directory permissions
# RUN chown -R www-data:www-data /var/www \
#     && chmod -R 755 /var/www/storage \
#     && chmod -R 755 /var/www/bootstrap/cache

# # Install PHP dependencies
# RUN composer install --no-dev --optimize-autoloader --no-interaction

# # Install Node dependencies and build assets
# RUN npm install && npm run build

# # Expose port 9000 for PHP-FPM
# EXPOSE 9000

# CMD ["php-fpm"]