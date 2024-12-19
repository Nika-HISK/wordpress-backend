import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);


@Injectable()
export class HelperService {
    async createDirectory(instanceDir:string) {
        await fs.promises.mkdir(instanceDir, { recursive: true });
    }

    async WriteDockerForDisk(filePath:string, dockerComposeYml:string) {
        await fs.promises.writeFile(filePath, dockerComposeYml.trim());
        console.log(
          `docker-compose.yml file created for instance`,
        );
    }



    async getContainerName(instanceId:string) {

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
    }


    async istallWpCli(wordpressContainerName:string, instanceId:string) {
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
    }


    async checkWpConfig(wordpressContainerName:string) {
        console.log('Checking for existing wp-config.php...');
        const checkConfigCmd = `docker exec ${wordpressContainerName} ls /var/www/html/wp-config.php`;
        try {
          await execAsync(checkConfigCmd); 
          console.log('wp-config.php exists. Removing...');
          await execAsync(
            `docker exec ${wordpressContainerName} rm /var/www/html/wp-config.php`,
          );
          console.log('wp-config.php removed.');
        } catch (error) {
          console.log('wp-config.php does not exist. No need to remove.');
        }
    }


    async createWpConfig(wordpressContainerName:string, instanceId:string, siteTitle:string, wpAdminUser:string, wpAdminPassword:string, wpAdminEmail:string ,instancePort:number) {
        
      await execAsync(
        `docker exec ${wordpressContainerName} wp config create --dbname=${siteTitle} --dbuser=${wpAdminUser} --dbpass=${wpAdminPassword} --dbhost=db${instanceId} --path=/var/www/html --allow-root`,
      );
      console.log(`wp-config.php created for instance ${instanceId}.`);

      await execAsync(
        `docker exec ${wordpressContainerName} wp core install --url="localhost:${instancePort}" --title="${siteTitle}" --admin_user="${wpAdminUser}" --admin_password="${wpAdminPassword}" --admin_email="${wpAdminEmail}" --skip-email --allow-root`,
      );
      console.log(`WordPress installed for instance ${instanceId}.`);

    }


    async activatePlugins(wordpressContainerName:string) {
        await execAsync(
            `docker exec ${wordpressContainerName} wp plugin install wordpress-importer --activate --allow-root`,
          );
          
          await execAsync(
            `docker exec ${wordpressContainerName} chown -R www-data:www-data /var/www/html`,
          );
    }


    async deleteContainerWithVolumes(containerName: string): Promise<void> {
        try {
          // Check if the container exists
          const containerCheck = await execAsync(
            `docker ps -a --filter "name=${containerName}" --format "{{.Names}}"`
          );
      
          if (!containerCheck.stdout.trim()) {
            console.log(`Container '${containerName}' does not exist.`);
            return;
          }
      
          // Stop the container
          await execAsync(`docker stop ${containerName}`);
          console.log(`Stopped container '${containerName}'.`);
      
          // Remove the container and its volumes
          await execAsync(`docker rm --volumes ${containerName}`);
          console.log(`Deleted container '${containerName}' and its volumes.`);
        } catch (error) {
          console.error(`Error deleting container '${containerName}': ${error.message}`);
          throw error;
        }
      }

}
