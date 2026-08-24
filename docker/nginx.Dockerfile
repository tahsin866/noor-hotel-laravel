FROM nginx:alpine

# Nginx Conf কপি করা
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Static Assets কপি করা
COPY public /var/www/public