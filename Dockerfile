FROM php:8.2-cli
WORKDIR /var/www/html
COPY . /var/www/html/
ENV DATA_DIR=/data
CMD ["sh","-c","mkdir -p /data; [ -f /data/users.json ] || cp /var/www/html/users.json /data/users.json; rm -f /var/www/html/users.json; PHP_CLI_SERVER_WORKERS=4 exec php -S 0.0.0.0:${PORT:-8080} -t /var/www/html router.php"]
