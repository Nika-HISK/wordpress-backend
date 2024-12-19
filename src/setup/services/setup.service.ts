import { Injectable, NotFoundException } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { CreateSetupDto } from '../dto/create-setup.dto';
import { SetupRepository } from '../repositories/setup.repository';
import * as crypto from 'crypto';
import { KubernetesService } from './kubernetes.service';

const execAsync = promisify(exec);

@Injectable()
export class SetupService {
  constructor(
    private readonly setupRepository: SetupRepository,
    private readonly k8sService: KubernetesService,
  ) {}

  async runKubectlCommand(namespace: string, podName: string, command: string) {
    const kubectlCommand = `kubectl exec ${podName} -n ${namespace} -- ${command}`;
    try {
      const { stdout, stderr } = await execAsync(kubectlCommand);
      if (stderr) {
        console.error(`Error executing command "${command}":`, stderr);
      }
      return stdout;
    } catch (error) {
      console.error(`Command "${command}" failed:`, error);
      throw new Error(`Failed to execute command "${command}"`);
    }
  }

  async setupWordPress(createSetupDto: CreateSetupDto, userId: number) {
    const namespace = `user-${userId}`;
    const instanceId = crypto.randomBytes(4).toString('hex');
    const uniqueId = crypto.randomBytes(6).toString('hex');
    const mysqlPassword = crypto.randomBytes(8).toString('hex');
    const siteTitle = createSetupDto.siteTitle || 'My WordPress Site';
    const wpAdminUser = createSetupDto.wpAdminUser || 'admin';
    const wpAdminEmail = createSetupDto.wpAdminEmail || 'example@example.com'
    const wpAdminPassword = createSetupDto.wpAdminPassword || 'password123';


    // Step 1: Create Namespace
    await this.k8sService.createNamespace(namespace);

    // Step 2: Create MySQL Secret
    const mysqlSecretManifest = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: { name: `mysql-secret-${instanceId}`, namespace },
      type: 'Opaque',
      data: {
        MYSQL_ROOT_PASSWORD: Buffer.from(mysqlPassword).toString('base64'),
      },
    };
    await this.k8sService.applyManifest(namespace, mysqlSecretManifest);

    // Step 3: Deploy MySQL
    const mysqlDeploymentManifest = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: { name: `mysql-${instanceId}`, namespace },
      spec: {
        replicas: 1,
        selector: { matchLabels: { app: `mysql-${instanceId}` } },
        template: {
          metadata: { labels: { app: `mysql-${instanceId}` } },
          spec: {
            containers: [
              {
                name: 'mysql',
                image: 'mysql:8.0',
                ports: [{ containerPort: 3306 }],
                env: [
                  {
                    name: 'MYSQL_ROOT_PASSWORD',
                    valueFrom: {
                      secretKeyRef: {
                        name: `mysql-secret-${instanceId}`,
                        key: 'MYSQL_ROOT_PASSWORD',
                      },
                    },
                  },
                  { name: 'MYSQL_DATABASE', value: 'wordpress' },
                ],
              },
            ],
          },
        },
      },
    };
    await this.k8sService.applyManifest(namespace, mysqlDeploymentManifest);

    const mysqlServiceManifest = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: { name: `mysql-${instanceId}`, namespace },
      spec: {
        ports: [{ protocol: 'TCP', port: 3306, targetPort: 3306 }],
        selector: { app: `mysql-${instanceId}` },
        type: 'ClusterIP',
      },
    };
    await this.k8sService.applyManifest(namespace, mysqlServiceManifest);

    // Step 4: Deploy WordPress
    const wordpressDeploymentManifest = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: { name: `wordpress-${instanceId}`, namespace },
      spec: {
        replicas: 1,
        selector: { matchLabels: { app: `wordpress-${instanceId}`, 'unique-id': uniqueId } },
        template: {
          metadata: { labels: { app: `wordpress-${instanceId}`, 'unique-id': uniqueId } },
          spec: {
            containers: [
              {
                name: 'wordpress',
                image: 'wordpress:latest',
                ports: [{ containerPort: 80 }],
                env: [
                  { name: 'WORDPRESS_DB_HOST', value: `mysql-${instanceId}:3306` },
                  { name: 'WORDPRESS_DB_NAME', value: 'wordpress' },
                  { name: 'WORDPRESS_DB_USER', value: 'root' },
                  {
                    name: 'WORDPRESS_DB_PASSWORD',
                    valueFrom: {
                      secretKeyRef: {
                        name: `mysql-secret-${instanceId}`,
                        key: 'MYSQL_ROOT_PASSWORD',
                      },
                    },
                  },
                ],
              },
            ],
          },
        },
      },
    };
    await this.k8sService.applyManifest(namespace, wordpressDeploymentManifest);

    const wordpressServiceManifest = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: { name: `wordpress-${instanceId}`, namespace },
      spec: {
        ports: [
          { protocol: 'TCP', port: 8081, targetPort: 80 },
        ],
        selector: { app: `wordpress-${instanceId}` },
        type: 'LoadBalancer', // Expose WordPress via LoadBalancer
      },
    };
    await this.k8sService.applyManifest(namespace, wordpressServiceManifest);

    // Step 5: Save Pod Name in the Database
    const podName = await this.k8sService.findPodByLabel(namespace, 'unique-id', uniqueId);
    
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await this.runKubectlCommand(namespace, podName, 'apt-get update');
    await this.runKubectlCommand(namespace, podName, 'apt-get install -y curl');
    await this.runKubectlCommand(
      namespace,
      podName,
      'curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar',
    );
    await this.runKubectlCommand(namespace, podName, 'chmod +x wp-cli.phar');
    await this.runKubectlCommand(namespace, podName, 'mv wp-cli.phar /usr/local/bin/wp');
    console.log('WP-CLI installed.');

    // Wait for a moment before proceeding
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Check if wp-config.php exists
    try {
      await this.runKubectlCommand(namespace, podName, 'ls /var/www/html/wp-config.php');
      console.log('wp-config.php exists. Skipping removal.');
    } catch {
      console.log('wp-config.php does not exist. Proceeding with creation...');
      await this.runKubectlCommand(
        namespace,
        podName,
        `wp config create --dbname=wordpress --dbuser=root --dbpass=${mysqlPassword} --dbhost=mysql:3306 --path=/var/www/html --allow-root --force`,
      );
      console.log('wp-config.php created.');
    }
    const wordpressService = await this.k8sService.getService(namespace, `wordpress-${instanceId}`);
    const nodePort = wordpressService.spec.ports.find(port => port.port === 8081)?.nodePort;

    // Install WordPress
    console.log('Installing WordPress...');
    await this.runKubectlCommand(
      namespace,
      podName,
      `wp core install --url="http://49.12.148.222:${nodePort}" --title="${siteTitle}" --admin_user="${wpAdminUser}" --admin_password="${wpAdminPassword}" --admin_email="${wpAdminEmail}" --skip-email --allow-root`,
    );
    console.log('WordPress installed.');

    // Activate necessary plugins
    console.log('Activating WordPress plugins...');
    await this.runKubectlCommand(namespace, podName, 'wp plugin install wordpress-importer --activate --allow-root');
    await this.runKubectlCommand(namespace, podName, 'wp theme activate twentytwentyfour --allow-root')

    // Set file permissions
    console.log('Setting file permissions...');
    try {
      await this.runKubectlCommand(namespace, podName, 'chown -R www-data:www-data /var/www/html');
    } catch {
      console.log('Error setting file permissions: Read-only file system. Skipping chown.');
    }

    

    await this.setupRepository.SaveUserWordpress(
      namespace,
      createSetupDto,
      podName,
      nodePort,
      userId,
      '8.0',
    );

    // Retrieve NodePort for WordPress (if exposed as LoadBalancer)

    return {
      namespace,
      wordpressUrl: `http://49.12.148.222:${nodePort}`, // Replace <node-ip> with your cluster's node IP
    };
  }

  async deleteWordpress(id: number) {
    const setup = await this.setupRepository.findOne(id);
    if (!setup) {
      throw new Error(`Setup with ID ${id} not found`);
    }
  
    const { wordpressContainerName, dbContainerName } = setup;
    
    let wordpressVolumes: string[] = [];
    let dbVolumes: string[] = [];
  
    try {
      wordpressVolumes = await this.getVolumes(wordpressContainerName);
  
      await execAsync(`docker container stop ${wordpressContainerName}`);
      await execAsync(`docker container rm ${wordpressContainerName}`);
    } catch (error) {
      console.error(`Failed to stop or delete WordPress container: ${error.message}`);
    }
  
    try {
      dbVolumes = await this.getVolumes(dbContainerName);
  
      await execAsync(`docker container stop ${dbContainerName}`);
      await execAsync(`docker container rm ${dbContainerName}`);
    } catch (error) {
      console.error(`Failed to stop or delete DB container: ${error.message}`);
    }
  
    try {
      const allVolumes = [...wordpressVolumes, ...dbVolumes];
      for (const volume of allVolumes) {
        await execAsync(`docker volume rm ${volume}`);
      }
    } catch (error) {
      console.error(`Failed to remove volumes: ${error.message}`);
      throw error;
    }
  
    return await this.setupRepository.deleteSetup(id);
  }
  
  private async getVolumes(containerName: string): Promise<string[]> {
    if (!containerName) return [];
  
    try {
      const { stdout } = await execAsync(`docker inspect ${containerName}`);
      const containerDetails = JSON.parse(stdout);
  
      const volumes = containerDetails[0]?.Mounts?.map((mount) => mount.Name).filter(Boolean) || [];
      return volumes;
    } catch (error) {
      console.error(`Failed to get volumes for container ${containerName}: ${error.message}`);
      return [];
    }
  }
  
  
  

  async findAll() {
    return await this.setupRepository.findAll();
  }

  async findOne(id: number) {
    return await this.setupRepository.findOne(id);
  }

  async findByTitle() {
    return await this.setupRepository.findByTitle();
  }

  async findByport() {
    return await this.setupRepository.findByport();
  }

  async findByusername() {
    return await this.setupRepository.findByusername();
  }
}
