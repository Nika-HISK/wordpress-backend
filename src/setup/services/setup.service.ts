import { Injectable, NotFoundException } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
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

  async setupWordPress(createSetupDto: CreateSetupDto, userId: number) {
    const namespace = `user-${userId}`;
    console.log(namespace);
    const instanceId = crypto.randomBytes(4).toString('hex'); // Random instance suffix
    const containerName = `wp-${instanceId}`;
    const mysqlPassword = crypto.randomBytes(8).toString('hex'); // Secure MySQL password
    const pvcName = `wp-pvc-${instanceId}`;
    const ingressHost = `wordpress-${instanceId}.example.com`;

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

    // Step 3: Create Persistent Volume Claim (PVC)
    const pvcManifest = {
      apiVersion: 'v1',
      kind: 'PersistentVolumeClaim',
      metadata: { name: pvcName, namespace },
      spec: {
        accessModes: ['ReadWriteOnce'],
        resources: { requests: { storage: '5Gi' } },
      },
    };
    await this.k8sService.applyManifest(namespace, pvcManifest);

    // Step 4: Deploy MySQL
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
                image: 'mysql:5.7',
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
                ],
                volumeMounts: [
                  { mountPath: '/var/lib/mysql', name: 'mysql-storage' },
                ],
              },
            ],
            volumes: [
              {
                name: 'mysql-storage',
                persistentVolumeClaim: { claimName: pvcName },
              },
            ],
          },
        },
      },
    };
    await this.k8sService.applyManifest(namespace, mysqlDeploymentManifest);

    // Step 5: Deploy WordPress
    const wordpressDeploymentManifest = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: { name: containerName, namespace },
      spec: {
        replicas: 1,
        selector: { matchLabels: { app: containerName } },
        template: {
          metadata: { labels: { app: containerName } },
          spec: {
            containers: [
              {
                name: 'wordpress',
                image: 'wordpress:latest',
                ports: [{ containerPort: 80 }],
                env: [
                  { name: 'WORDPRESS_DB_HOST', value: `mysql-${instanceId}` },
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
                  { name: 'WORDPRESS_DB_NAME', value: 'wordpress' },
                ],
                volumeMounts: [
                  { mountPath: '/var/www/html', name: 'wordpress-storage' },
                ],
              },
            ],
            volumes: [
              {
                name: 'wordpress-storage',
                persistentVolumeClaim: { claimName: pvcName },
              },
            ],
          },
        },
      },
    };
    await this.k8sService.applyManifest(namespace, wordpressDeploymentManifest);

    // Step 6: Create Ingress
    const ingressManifest = {
      apiVersion: 'networking.k8s.io/v1',
      kind: 'Ingress',
      metadata: { name: `wp-ingress-${instanceId}`, namespace },
      spec: {
        rules: [
          {
            host: ingressHost,
            http: {
              paths: [
                {
                  path: '/',
                  pathType: 'Prefix',
                  backend: {
                    service: { name: containerName, port: { number: 80 } },
                  },
                },
              ],
            },
          },
        ],
      },
    };
    await this.k8sService.applyManifest(namespace, ingressManifest);

    // Step 7: Save setup details to the database
    const setup = await this.setupRepository.SaveUserWordpress(
      createSetupDto,
      containerName,
      80, // Instance port
      userId, // User ID
      '7.4', // PHP version
    );

    return {
      containerName,
      namespace,
      ingressUrl: `http://${ingressHost}`,
    };
  }

  async deleteWorpress(id: number) {
    return await this.setupRepository.deleteUser(id);
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
