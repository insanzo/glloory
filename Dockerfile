FROM php:8.2-apache
RUN a2enmod rewrite \
 && sed -ri 's/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf
COPY . /var/www/html/
ENV DATA_DIR=/data
CMD ["sh","-c","sed -ri \"s/Listen 80/Listen ${PORT:-80}/\" /etc/apache2/ports.conf; sed -ri \"s/:80>/:${PORT:-80}>/\" /etc/apache2/sites-available/000-default.conf; mkdir -p /data; [ -f /data/users.json ] || cp /var/www/html/users.json /data/users.json; rm -f /var/www/html/users.json; chown -R www-data:www-data /data; exec apache2-foreground"]
