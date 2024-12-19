import { Injectable } from '@nestjs/common';

@Injectable()
export class YmlService {
  generateDockerComposeYml(
    instanceId: string,
    wpAdminPassword: string,
    wpAdminUser: string,
    siteTitle: string,
    instancePort: number
  ): string {
    return `
version: '3.8'

services:
  db${instanceId}:
    image: mysql:8.0
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: ${wpAdminPassword}
      MYSQL_DATABASE: ${siteTitle}
      MYSQL_USER: ${wpAdminUser}
      MYSQL_PASSWORD: ${wpAdminPassword}
    volumes:
      - db_data_${instanceId}:/var/lib/mysql

  wordpress${instanceId}:
    image: wordpress:latest
    restart: always
    depends_on:
      - db${instanceId}
    ports:
      - "${instancePort}:80"
    environment:
      WORDPRESS_DB_HOST: db${instanceId}
      WORDPRESS_DB_USER: ${wpAdminUser}
      WORDPRESS_DB_PASSWORD: ${wpAdminPassword}
    volumes:
      - wp_uploads_${instanceId}:/var/www/html/wp-content/uploads

volumes:
  db_data_${instanceId}:
  wp_uploads_${instanceId}:
    `;
  }
}
