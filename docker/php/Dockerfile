FROM php:8.3-fpm-alpine

# Cài đặt system dependencies và PHP extensions
RUN apk add --no-cache \
    git \
    curl \
    libpng-dev \
    libxml2-dev \
    zip \
    unzip \
    libzip-dev \
    oniguruma-dev \
    linux-headers \
    $PHPIZE_DEPS \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip opcache \
    && pecl install redis \
    && docker-php-ext-enable redis

# Cài đặt Composer
COPY --from=composer:2.8 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/backend

# Phân quyền
RUN chown -R www-data:www-data /var/www

USER www-data

EXPOSE 9000
CMD ["php-fpm"]
