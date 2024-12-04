import { Injectable, NotFoundException } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { CreateSetupDto } from '../dto/create-setup.dto';
import { SetupRepository } from '../repositories/setup.repository';

const execAsync = promisify(exec);
const execPromise = promisify(exec);

@Injectable()
export class SetupService {
  constructor(private readonly setupRepository: SetupRepository
  ) {}
  private usedPorts: Set<number> = new Set();
  private portRange = { min: 4000, max: 8000 };
  private async getAvailablePort(): Promise<number> {
    for (let port = this.portRange.min; port <= this.portRange.max; port++) {
      const portInUse = await this.setupRepository.findByPort(port);
      if (!portInUse) {
        this.usedPorts.add(port);
        return port;
      }
    }
    throw new Error('No available ports in the specified range.');
  }

//   async setupWordpress(
//     config: CreateSetupDto,
//     instanceId: string,
//     id: number,
//   ): Promise<string> {
//     const { wpAdminUser, wpAdminPassword, wpAdminEmail, siteTitle } = config;
//     const instancePort = await this.getAvailablePort();
//     try {
//       console.log(`Starting WordPress setup for instance ${instanceId}...`);
//       const dockerComposeYml = `
// version: '3.8'

// services:
//   db${instanceId}:
//     image: mysql:8.0
//     restart: always
//     environment:
//       MYSQL_ROOT_PASSWORD: ${wpAdminPassword}
//       MYSQL_DATABASE: ${siteTitle}
//       MYSQL_USER: ${wpAdminUser}
//       MYSQL_PASSWORD: ${wpAdminPassword}
//     volumes:
//       - db_data_${instanceId}:/var/lib/mysql

//   wordpress${instanceId}:
//     image: wordpress:latest
//     restart: always
//     depends_on:
//       - db${instanceId}
//     ports:
//       - "${instancePort}:80"
//     environment:
//       WORDPRESS_DB_HOST: db${instanceId}
//       WORDPRESS_DB_USER: ${wpAdminUser}
//       WORDPRESS_DB_PASSWORD: ${wpAdminPassword}
//     volumes:
//       - wp_uploads_${instanceId}:/var/www/html/wp-content/uploads 

// volumes:
//   db_data_${instanceId}:
//   wp_uploads_${instanceId}:
//       `;

//       // Directory for instance-specific Docker setup
//       const instanceDir = path.join(
//         __dirname,
//         `wordpress_instance_${instanceId}`,
//       );
//       await fs.promises.mkdir(instanceDir, { recursive: true });
//       const filePath = path.join(instanceDir, 'docker-compose.yml');

//       // Writing the docker-compose.yml file to disk
//       await fs.promises.writeFile(filePath, dockerComposeYml.trim());
//       console.log(
//         `docker-compose.yml file created for instance ${instanceId}.`,
//       );

//       const isWindows = process.platform === 'win32';
//       const dockerCommand = isWindows
//         ? 'docker-compose up -d'
//         : 'docker compose up -d';

//       await execAsync(dockerCommand, { cwd: instanceDir });
//       console.log(`Docker services started for instance ${instanceId}.`);

//       // Retrieve the WordPress container name without `grep`
//       const { stdout } = await execAsync(
//         `docker ps --filter "ancestor=wordpress" --format "{{.Names}}"`,
//       );
//       const wordpressContainerName = stdout
//         .split('\n')
//         .find((name) => name.includes(`wordpress${instanceId}`))
//         .trim();

//       if (!wordpressContainerName) {
//         throw new Error(`Failed to find container for instance ${instanceId}`);
//       }

//       console.log(
//         `WordPress container name for instance ${instanceId}: ${wordpressContainerName}`,
//       );

//       // Install WP-CLI and necessary tools
//       await execAsync(`docker exec ${wordpressContainerName} apt-get update`);
//       await execAsync(
//         `docker exec ${wordpressContainerName} apt-get install -y curl`,
//       );
//       await execAsync(
//         `docker exec ${wordpressContainerName} curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar`,
//       );
//       await execAsync(
//         `docker exec ${wordpressContainerName} chmod +x wp-cli.phar`,
//       );
//       await execAsync(
//         `docker exec ${wordpressContainerName} mv wp-cli.phar /usr/local/bin/wp`,
//       );
//       console.log(`WP-CLI installed in instance ${instanceId}.`);
//       await this.sleep(30000);

//       // Check if wp-config.php exists, and if so, remove it
//       console.log('Checking for existing wp-config.php...');
//       const checkConfigCmd = `docker exec ${wordpressContainerName} ls /var/www/html/wp-config.php`;
//       try {
//         await execAsync(checkConfigCmd); // Try to list the wp-config.php file
//         console.log('wp-config.php exists. Removing...');
//         await execAsync(
//           `docker exec ${wordpressContainerName} rm /var/www/html/wp-config.php`,
//         );
//         console.log('wp-config.php removed.');
//       } catch (error) {
//         console.log('wp-config.php does not exist. No need to remove.');
//       }
//       // Creating wp-config.php and installing WordPress
//       await execAsync(
//         `docker exec ${wordpressContainerName} wp config create --dbname=${siteTitle} --dbuser=${wpAdminUser} --dbpass=${wpAdminPassword} --dbhost=db${instanceId} --path=/var/www/html --allow-root`,
//       );
//       console.log(`wp-config.php created for instance ${instanceId}.`);

//       await execAsync(
//         `docker exec ${wordpressContainerName} wp core install --url="localhost:${instancePort}" --title="${siteTitle}" --admin_user="${wpAdminUser}" --admin_password="${wpAdminPassword}" --admin_email="${wpAdminEmail}" --skip-email --allow-root`,
//       );
//       console.log(`WordPress installed for instance ${instanceId}.`);

//       // Activate necessary plugins
//       await execAsync(
//         `docker exec ${wordpressContainerName} wp plugin install wordpress-importer --activate --allow-root`,
//       );
      
//       await execAsync(
//         `docker exec ${wordpressContainerName} chown -R www-data:www-data /var/www/html`,
//       );

//       const wpInfoCmd = `docker exec ${wordpressContainerName} wp --info --json --allow-root`;
//       const { stdout: wpInfoJson } = await execAsync(wpInfoCmd);
//       const wpInfo = JSON.parse(wpInfoJson);
//       const phpVersion = wpInfo.php_version

//       await this.setupRepository.SaveUserWordpress(
//         config,
//         wordpressContainerName,
//         instancePort,
//         id,
//         phpVersion
//       );
//       return `WordPress setup complete for instance ${instanceId} on port ${instancePort}!`;
//     } catch (error) {
//       console.error(
//         `Error during WordPress setup for instance ${instanceId}:`,
//         error,
//       );
//       throw new Error(`WordPress setup failed for instance ${instanceId}`);
//     }
//   }

//   async deleteSetupById(setupId: number): Promise<string> {
//     // Fetch the setup by ID
//     const setup = await this.setupRepository.findOne(setupId);
//     if (!setup) {
//       throw new NotFoundException(`Setup with ID ${setupId} not found.`);
//     }
  
//     const containerName = setup.containerName; // WordPress container name
//     const dbContainerName = `${containerName}-db`; // Assuming a naming convention
  
//     try {
//       // Delete the WordPress container
//       await this.deleteContainerWithVolumes(containerName);
  
//       // Delete the associated SQL container
//       await this.deleteContainerWithVolumes(dbContainerName);
  
//       // Soft delete the setup from the database
//       await this.setupRepository.deleteSetup(setupId);
//       console.log(`Soft deleted setup entry with ID ${setupId} from the database.`);
  
//       return `Both '${containerName}' and its associated database container '${dbContainerName}' have been successfully deleted.`;
//     } catch (error) {
//       throw new Error(
//         `Failed to delete containers and setup: ${error.message}`
//       );
//     }
//   }
  
//   // Helper method to delete a container and its volumes
//   private async deleteContainerWithVolumes(containerName: string): Promise<void> {
//     try {
//       // Check if the container exists
//       const containerCheck = await execAsync(
//         `docker ps -a --filter "name=${containerName}" --format "{{.Names}}"`
//       );
  
//       if (!containerCheck.stdout.trim()) {
//         console.log(`Container '${containerName}' does not exist.`);
//         return;
//       }
  
//       // Stop the container
//       await execAsync(`docker stop ${containerName}`);
//       console.log(`Stopped container '${containerName}'.`);
  
//       // Remove the container and its volumes
//       await execAsync(`docker rm --volumes ${containerName}`);
//       console.log(`Deleted container '${containerName}' and its volumes.`);
//     } catch (error) {
//       console.error(`Error deleting container '${containerName}': ${error.message}`);
//       throw error;
//     }
//   }

//   private sleep(ms: number): Promise<void> {
//     return new Promise((resolve) => setTimeout(resolve, ms));
//   }

//   async deleteWorpress(id: number) {
//     return await this.setupRepository.deleteUser(id);
//   }

//   async findAll() {
//     return await this.setupRepository.findAll();
//   }

//   async findOne(id: number) {
//     return await this.setupRepository.findOne(id);
//   }

//   async findByTitle() {
//     return await this.setupRepository.findByTitle();
//   }
//   async findByport() {
//     return await this.setupRepository.findByport()
//   }

//   async findByusername(){
//     return await this.setupRepository.findByusername()
//   }
  
// }

  private podName: string = 'wordpress-8ff6dc4f5-q6qxh';  // Replace with your actual pod name

  // Function to execute commands in the WordPress pod using kubectl exec
  async runKubectlCommand(command: string): Promise<string> {
    try {
      const cmd = `kubectl exec ${this.podName} -- ${command}`;  // Redirect stderr to stdout
      const { stdout, stderr } = await execPromise(cmd);
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
      return stdout;
    } catch (error) {
      console.error(`Error executing command in pod: ${error.message}`);
      throw new Error(`Error executing command in pod: ${error.message}`);
    }
  }

  // Function to install WP-CLI and set up WordPress
  async setupWordPressK8S(
    siteTitle: string,
    wpAdminUser: string,
    wpAdminPassword: string,
    wpAdminEmail: string
  ): Promise<string> {
    try {
      console.log("Installing WP-CLI and setting up WordPress...");
  
      // Install WP-CLI (via kubectl exec)
      await this.runKubectlCommand('apt-get update');
      await this.runKubectlCommand('apt-get install -y curl');
      await this.runKubectlCommand('curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar');
      await this.runKubectlCommand('chmod +x wp-cli.phar');
      await this.runKubectlCommand('mv wp-cli.phar /usr/local/bin/wp');
      console.log("WP-CLI installed.");
  
      // Wait for a moment before proceeding
      await new Promise((resolve) => setTimeout(resolve, 30000));
  
      // Check if wp-config.php exists, and if so, remove it (skip removal if the file is busy)
      console.log('Checking for existing wp-config.php...');
      try {
        await this.runKubectlCommand('ls /var/www/html/wp-config.php');
        console.log('wp-config.php exists. Skipping removal.');
      } catch (error) {
        console.log('wp-config.php does not exist. No need to remove.');
      }
  
      // Skip wp-config.php creation if it already exists
      console.log('Checking if wp-config.php exists before creating...');
      try {
        await this.runKubectlCommand('ls /var/www/html/wp-config.php');
        console.log('wp-config.php already exists. Skipping creation.');
      } catch (error) {
        console.log('wp-config.php does not exist. Proceeding with creation...');
        await this.runKubectlCommand(
          `wp config create --dbname=${siteTitle} --dbuser=${wpAdminUser} --dbpass=${wpAdminPassword} --dbhost=mysql:3306 --path=/var/www/html --allow-root --force`
        );
        console.log('wp-config.php created.');
      }
  
      // Install WordPress
      console.log('Installing WordPress...');
      await this.runKubectlCommand(
        `wp core install --url="http://http://127.0.0.1" --title="${siteTitle}" --admin_user="${wpAdminUser}" --admin_password="${wpAdminPassword}" --admin_email="abramishvilisaba@gmail.com" --skip-email --allow-root`
      );
      console.log('WordPress installed.');
  
      // Activate necessary plugins (e.g., WordPress Importer plugin)
      console.log('Activating WordPress plugins...');
      await this.runKubectlCommand('wp plugin install wordpress-importer --activate --allow-root');
  
      // Set proper file permissions (skip if read-only filesystem)
      console.log('Setting file permissions...');
      try {
        await this.runKubectlCommand('chown -R www-data:www-data /var/www/html');
      } catch (chownError) {
        console.log('Error setting file permissions: Read-only file system. Skipping chown.');
      }
  
      console.log('WordPress setup complete.');
  
      return 'WordPress setup complete!';
    } catch (error) {
      console.error('Error during WordPress setup:', error);
      throw new Error(`WordPress setup failed: ${error.message}`);
    }
  }
}