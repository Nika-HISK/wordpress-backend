import { Injectable } from '@nestjs/common';
import { UpdateSetupDto } from '../dto/update-setup.dto';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { CreateSetupDto } from '../dto/create-setup.dto';
import { SetupRepository } from '../repositories/setup.repository';

const execAsync = promisify(exec);


@Injectable()
export class SetupService {
  constructor(private readonly setupRepository:SetupRepository) {}
  private usedPorts: Set<number> = new Set();
  private portRange = { min: 4000, max: 8000 };
  private getAvailablePort(): number {
    for (let port = this.portRange.min; port <= this.portRange.max; port++) {
      if (!this.usedPorts.has(port)) {
        this.usedPorts.add(port);
        return port;
      }
    }
    throw new Error('No available ports in the specified range.');
  }
  async setupWordpress(config: CreateSetupDto, instanceId: string, id: number, ): Promise<string> {
    const {
      wpAdminUser,
      wpAdminPassword,
      wpAdminEmail,
      siteTitle,
    } = config;
    const instancePort = this.getAvailablePort();
    try {
      console.log(`Starting WordPress setup for instance ${instanceId}...`);
      const dockerComposeYml = `
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

      // Directory for instance-specific Docker setup
      const instanceDir = path.join(
        __dirname,
        `wordpress_instance_${instanceId}`,
      );
      await fs.promises.mkdir(instanceDir, { recursive: true });
      const filePath = path.join(instanceDir, 'docker-compose.yml');

      // Writing the docker-compose.yml file to disk
      await fs.promises.writeFile(filePath, dockerComposeYml.trim());
      console.log(
        `docker-compose.yml file created for instance ${instanceId}.`,
      );

      const isWindows = process.platform === 'win32';
      const dockerCommand = isWindows
        ? 'docker-compose up -d'
        : 'docker compose up -d';

      await execAsync(dockerCommand, { cwd: instanceDir });
      console.log(`Docker services started for instance ${instanceId}.`);

      // Retrieve the WordPress container name without `grep`
      const { stdout } = await execAsync(
        `docker ps --filter "ancestor=wordpress" --format "{{.Names}}"`,
      );
      const wordpressContainerName = stdout
        .split('\n')
        .find((name) => name.includes(`wordpress${instanceId}`))
        .trim();

      if (!wordpressContainerName) {
        throw new Error(`Failed to find container for instance ${instanceId}`);
      }

      console.log(
        `WordPress container name for instance ${instanceId}: ${wordpressContainerName}`,
      );

      // Install WP-CLI and necessary tools
      await execAsync(`docker exec ${wordpressContainerName} apt-get update`);
      await execAsync(
        `docker exec ${wordpressContainerName} apt-get install -y curl`,
      );
      await execAsync(
        `docker exec ${wordpressContainerName} curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar`,
      );
      await execAsync(
        `docker exec ${wordpressContainerName} chmod +x wp-cli.phar`,
      );
      await execAsync(
        `docker exec ${wordpressContainerName} mv wp-cli.phar /usr/local/bin/wp`,
      );
      console.log(`WP-CLI installed in instance ${instanceId}.`);
      await this.sleep(30000);

      // Check if wp-config.php exists, and if so, remove it
      console.log('Checking for existing wp-config.php...');
      const checkConfigCmd = `docker exec ${wordpressContainerName} ls /var/www/html/wp-config.php`;
      try {
        await execAsync(checkConfigCmd); // Try to list the wp-config.php file
        console.log('wp-config.php exists. Removing...');
        await execAsync(
          `docker exec ${wordpressContainerName} rm /var/www/html/wp-config.php`,
        );
        console.log('wp-config.php removed.');
      } catch (error) {
        console.log('wp-config.php does not exist. No need to remove.');
      }
      // Creating wp-config.php and installing WordPress
      await execAsync(
        `docker exec ${wordpressContainerName} wp config create --dbname=${siteTitle} --dbuser=${wpAdminUser} --dbpass=${wpAdminPassword} --dbhost=db${instanceId} --path=/var/www/html --allow-root`,
      );
      console.log(`wp-config.php created for instance ${instanceId}.`);

      await execAsync(
        `docker exec ${wordpressContainerName} wp core install --url="localhost:${instancePort}" --title="${siteTitle}" --admin_user="${wpAdminUser}" --admin_password="${wpAdminPassword}" --admin_email="${wpAdminEmail}" --skip-email --allow-root`,
      );
      console.log(`WordPress installed for instance ${instanceId}.`);

      // Activate necessary plugins
      await execAsync(
        `docker exec ${wordpressContainerName} wp plugin install wordpress-importer --activate --allow-root`,
      );
      await this.setupRepository.SaveUserWordpress(config,wordpressContainerName,instancePort,id)
      return `WordPress setup complete for instance ${instanceId} on port ${instancePort}!`;
      
    } catch (error) {
      console.error(
        `Error during WordPress setup for instance ${instanceId}:`,
        error,
      );
      throw new Error(`WordPress setup failed for instance ${instanceId}`);
    }

  }


  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }


  async deleteWorpress(id:number) {
    return await this.setupRepository.deleteUser(id)
  }

  async findAll() {
    return await this.setupRepository.findAll()
  }

  async findOne(id:number) {
    return await this.setupRepository.findOne(id)
  }

  async findByTitle() {
    return await this.setupRepository.findByTitle()
  }

}
