import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
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
    const kubectlCommand = `kubectl exec ${podName} -n ${namespace} -c wordpress -- ${command}`;
    try {
      const { stdout, stderr } = await execAsync(kubectlCommand);
      if (stderr) {
        console.error(`Error executing command "${command}":`, stderr);
      }
      return stdout;
    } catch (error) {
      console.error(`Command "${command}" failed:`, error);
      throw new InternalServerErrorException(
        `Failed to execute command "${command}"`,
      );
    }
  }

  async setupWordPress(createSetupDto: CreateSetupDto, userId: number) {
    const namespace = `user-${userId}`;
    const instanceId = crypto.randomBytes(4).toString('hex');
    const uniqueId = crypto.randomBytes(6).toString('hex');
    const mysqlPassword = crypto.randomBytes(8).toString('hex');
    const siteTitle = createSetupDto.siteTitle;
    const wpAdminUser = createSetupDto.wpAdminUser;
    const wpAdminEmail = createSetupDto.wpAdminEmail;
    const wpAdminPassword = createSetupDto.wpAdminPassword;
    const siteName = createSetupDto.siteName;

    await this.k8sService.createNamespace(namespace);

    const mysqlPVManifest = {
      apiVersion: 'v1',
      kind: 'PersistentVolume',
      metadata: {
        name: `mysql-pv-${instanceId}`,
        namespace,
        labels: { app: `mysql-pv-label-${instanceId}` },
      },
      spec: {
        capacity: {
          storage: '10Gi',
        },
        accessModes: ['ReadWriteOnce'],
        persistentVolumeReclaimPolicy: 'Retain',
        hostPath: { path: `/mnt/data/mysql-${instanceId}` },
      },
    };

    const wpPVManifest = {
      apiVersion: 'v1',
      kind: 'PersistentVolume',
      metadata: {
        name: `wordpress-pv-${instanceId}`,
        namespace,
        labels: { app: `wordpress-pv-label-${instanceId}` },
      },
      spec: {
        capacity: {
          storage: '10Gi',
        },
        accessModes: ['ReadWriteOnce'],
        persistentVolumeReclaimPolicy: 'Retain',
        hostPath: { path: `/mnt/data/wordpress-${instanceId}` },
      },
    };

    await this.k8sService.applyManifest(namespace, mysqlPVManifest);
    await this.k8sService.applyManifest(namespace, wpPVManifest);

    const mysqlPVCManifest = {
      apiVersion: 'v1',
      kind: 'PersistentVolumeClaim',
      metadata: {
        name: `mysql-pvc-${instanceId}`,
        namespace,
        labels: { app: `mysql-pv-label-${instanceId}` },
      },
      spec: {
        accessModes: ['ReadWriteOnce'],
        resources: {
          requests: { storage: '10Gi' },
        },
      },
    };

    const wpPVCManifest = {
      apiVersion: 'v1',
      kind: 'PersistentVolumeClaim',
      metadata: {
        name: `wordpress-pvc-${instanceId}`,
        namespace,
        labels: { app: `wordpress-pv-label-${instanceId}` },
      },
      spec: {
        accessModes: ['ReadWriteOnce'],
        resources: {
          requests: { storage: '10Gi' },
        },
      },
    };

    await this.k8sService.applyManifest(namespace, mysqlPVCManifest);
    await this.k8sService.applyManifest(namespace, wpPVCManifest);

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
                volumeMounts: [
                  {
                    name: 'mysql-pv',
                    mountPath: '/var/lib/mysql',
                  },
                ],
              },
            ],
            volumes: [
              {
                name: 'mysql-pv',
                persistentVolumeClaim: {
                  claimName: `mysql-pvc-${instanceId}`,
                },
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

    const phpAdminDeploymentManifest = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: { name: `phpadmin-${instanceId}`, namespace },
      spec: {
        replicas: 1,
        selector: { matchLabels: { app: `phpadmin-${instanceId}` } },
        template: {
          metadata: { labels: { app: `phpadmin-${instanceId}` } },
          spec: {
            containers: [
              {
                name: 'phpmyadmin',
                image: 'phpmyadmin:latest',
                ports: [{ containerPort: 80 }],
                env: [
                  {
                    name: 'PMA_HOST',
                    value: `mysql-${instanceId}`,
                  },
                ],
              },
            ],
          },
        },
      },
    };
    await this.k8sService.applyManifest(namespace, phpAdminDeploymentManifest);

    const phpAdminServiceManifest = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: { name: `phpadmin-${instanceId}`, namespace },
      spec: {
        ports: [{ protocol: 'TCP', port: 8080, targetPort: 80 }],
        selector: { app: `phpadmin-${instanceId}` },
        type: 'LoadBalancer',
      },
    };
    await this.k8sService.applyManifest(namespace, phpAdminServiceManifest);

    const wordpressDeploymentManifest = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: `wordpress-${instanceId}`,
        namespace,
      },
      spec: {
        replicas: 1,
        selector: {
          matchLabels: {
            app: `wordpress-${instanceId}`,
            'unique-id': uniqueId,
          },
        },
        template: {
          metadata: {
            labels: {
              app: `wordpress-${instanceId}`,
              'unique-id': uniqueId,
            },
          },
          spec: {
            containers: [
              {
                name: 'nginx',
                image: 'nginx:latest',
                ports: [{ containerPort: 80 }],
                volumeMounts: [
                  {
                    name: 'wordpress-content',
                    mountPath: '/var/www/html',
                    readOnly: true,
                  },
                  { name: 'nginx-config', mountPath: '/etc/nginx/conf.d' },
                ],
              },
              {
                name: 'wordpress',
                image: 'wordpress:php8.1-fpm',
                env: [
                  {
                    name: 'WORDPRESS_DB_HOST',
                    value: `mysql-${instanceId}:3306`,
                  },
                  { name: 'WORDPRESS_DB_USER', value: 'root' },
                  { name: 'WORDPRESS_DB_PASSWORD', value: `${mysqlPassword}` },
                  { name: 'WORDPRESS_DB_NAME', value: 'wordpress' },
                ],
                volumeMounts: [
                  { name: 'wordpress-content', mountPath: '/var/www/html' },
                ],
              },
            ],
            volumes: [
              {
                name: 'wordpress-content',
                persistentVolumeClaim: {
                  claimName: `wordpress-pvc-${instanceId}`,
                },
              },
              {
                name: 'nginx-config',
                configMap: {
                  name: `nginx-config-${instanceId}`,
                },
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
      metadata: {
        name: `wordpress-${instanceId}`,
        namespace,
      },
      spec: {
        selector: {
          app: `wordpress-${instanceId}`,
          'unique-id': uniqueId,
        },
        ports: [
          {
            protocol: 'TCP',
            port: 80,
            targetPort: 80,
          },
        ],
        type: 'LoadBalancer',
      },
    };
    await this.k8sService.applyManifest(namespace, wordpressServiceManifest);

    const nginxConfigMapManifest = {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: `nginx-config-${instanceId}`,
        namespace,
      },
      data: {
        'default.conf': `
              # Use existing log_format if defined elsewhere
              access_log /var/log/nginx/access.log main;
  
              # Error log to capture 404 errors
              error_log /var/log/nginx/error.log warn;
  
              server {
                  listen 80;
                  server_name _;
      
                  root /var/www/html;
                  index index.php index.html index.htm;
      
                  # Main location block
                  location / {
                      try_files $uri $uri/ /index.php?$args;
                  }
      
                  # PHP handling block
                  location ~ \\.php$ {
                      include fastcgi_params;
                      fastcgi_pass 127.0.0.1:9000;
                      fastcgi_index index.php;
                      fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
                  }
      
                  # Deny access to hidden files (e.g., .htaccess)
                  location ~ /\\.ht {
                      deny all;
                  }
              }
          `,
      },
    };

    await this.k8sService.applyManifest(namespace, nginxConfigMapManifest);

    // Step 5: Save Pod Name in the Database
    const podName = await this.k8sService.findPodByLabel(
      namespace,
      'unique-id',
      uniqueId,
    );

    await new Promise((resolve) => setTimeout(resolve, 12000));
    await this.runKubectlCommand(namespace, podName, 'apt-get update');
    await this.runKubectlCommand(namespace, podName, 'apt-get install -y curl');
    await this.runKubectlCommand(
      namespace,
      podName,
      'curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar',
    );
    await this.runKubectlCommand(namespace, podName, 'chmod +x wp-cli.phar');
    await this.runKubectlCommand(
      namespace,
      podName,
      'mv wp-cli.phar /usr/local/bin/wp',
    );
    console.log('WP-CLI installed.');

    // Wait for a moment before proceeding
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Check if wp-config.php exists

    console.log('wp-config.php exists. Skipping removal.');
    console.log('wp-config.php does not exist. Proceeding with creation...');
    await this.runKubectlCommand(
      namespace,
      podName,
      `wp config create --dbname=wordpress --dbuser=root --dbpass=${mysqlPassword} --dbhost=mysql-${instanceId}:3306 --path=/var/www/html --allow-root --force`,
    );
    console.log('wp-config.php created.');

    const wordpressService = await this.k8sService.getService(
      namespace,
      `wordpress-${instanceId}`,
    );
    const nodePort = wordpressService.spec.ports.find(
      (port) => port.port === 80,
    )?.nodePort;

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
    await this.runKubectlCommand(
      namespace,
      podName,
      'wp plugin install wordpress-importer --activate --allow-root',
    );
    await this.runKubectlCommand(
      namespace,
      podName,
      'wp theme activate twentytwentyfour --allow-root',
    );
    const output = await this.runKubectlCommand(
      namespace,
      podName,
      'wp db size --format=json --allow-root',
    );
    const dbName = JSON.parse(output);
    const readydbName = dbName[0].Name;

    // Set file permissions
    console.log('Setting file permissions...');
    try {
      await this.runKubectlCommand(
        namespace,
        podName,
        'chown -R www-data:www-data /var/www/html',
      );
    } catch {
      console.log(
        'Error setting file permissions: Read-only file system. Skipping chown.',
      );
    }

    // Get PHP version
    const phpVersionOutput = await this.runKubectlCommand(
      namespace,
      podName,
      'wp --info --format=json --allow-root',
    );
    const phpVersionInfo = JSON.parse(phpVersionOutput);
    const phpVersion = phpVersionInfo.php_version;

    // Get WordPress version
    const wpVersionOutput = await this.runKubectlCommand(
      namespace,
      podName,
      'wp core version --allow-root',
    );
    const wpVersion = wpVersionOutput.trim();

    const sqlPodName = await this.k8sService.findPodByLabel(
      namespace,
      'app',
      `mysql-${instanceId}`,
    );
    const wpDeployment = `wordpress-${instanceId}`;
    const sqlDeployment = `mysql-${instanceId}`;
    const replicaSets = await this.k8sService.listReplicaSets(namespace);
    const wpReplicaSet = replicaSets.find((rs) =>
      rs.metadata?.ownerReferences?.some(
        (owner) => owner.name === wpDeployment,
      ),
    )?.metadata?.name;

    const sqlReplicaSet = replicaSets.find((rs) =>
      rs.metadata?.ownerReferences?.some(
        (owner) => owner.name === sqlDeployment,
      ),
    )?.metadata?.name;
    const nodeIp = await this.k8sService.getNodeInternalIpForPod(
      podName,
      namespace,
    );
    const wpfullIp = `${nodeIp}:${nodePort}`;
    const phpAminIp = await this.k8sService.getPhpMyAdminNodePort(
      instanceId,
      namespace,
    );

    const phpAdminFullIp = `${nodeIp}:${phpAminIp}`;

    console.log(wpReplicaSet, sqlReplicaSet);

    await this.setupRepository.SaveUserWordpress(
      namespace,
      createSetupDto,
      podName,
      nodePort,
      userId,
      phpVersion,
      wpVersion,
      sqlPodName,
      wpDeployment,
      sqlDeployment,
      wpReplicaSet,
      sqlReplicaSet,
      nodeIp,
      wpfullIp,
      readydbName,
      mysqlPassword,
      siteName,
      phpAdminFullIp,
      instanceId
    );

    // Retrieve NodePort for WordPress (if exposed as LoadBalancer)

    return {
      namespace,
      wordpressUrl: `http://49.12.148.222:${nodePort}`, // Replace <node-ip> with your cluster's node IP
    };
  }

  async deleteSetup(setupId: number) {
    try {
      const setup = await this.findOne(setupId);
      if (!setup) {
        throw new NotFoundException(`Setup with ID ${setupId} not found`);
      }

      await execAsync(
        `kubectl delete deployment ${setup.wpDeployment} -n ${setup.nameSpace}`,
      );
      await execAsync(
        `kubectl delete deployment ${setup.sqlDeployment} -n ${setup.nameSpace}`,
      );
      return await this.setupRepository.deleteSetup(setupId);
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to delete setup',
        error.message,
      );
    }
  }

  async resetSetup(wpAdminPassword: string, userId: number, setupId: number) {
    try {
      const setup = await this.findOne(setupId);
      if (!setup) {
        throw new NotFoundException(`Setup with ID ${setupId} not found`);
      }

      const createSetupDto = {
        wpAdminUser: setup.wpAdminUser,
        wpAdminPassword: wpAdminPassword,
        wpAdminEmail: setup.wpAdminEmail,
        siteTitle: setup.siteTitle,
        siteName: setup.siteName,
      };

      await this.deleteSetup(setupId);
      const newSetup = await this.setupWordPress(createSetupDto, userId);

      return `Successfully reset on port ${newSetup.wordpressUrl}`;
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to reset setup',
        error.message,
      );
    }
  }

  async getDecryptedMysqlPassword(id: number) {
    try {
      const password = await this.setupRepository.getDecryptedMysqlPassword(id);
      if (!password) {
        throw new NotFoundException(
          `MySQL password for setup with ID ${id} not found`,
        );
      }
      return password;
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to decrypt MySQL password',
        error.message,
      );
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
