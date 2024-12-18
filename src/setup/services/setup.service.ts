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
  const instanceId = crypto.randomBytes(4).toString('hex');
  const mysqlPassword = crypto.randomBytes(8).toString('hex');

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
      selector: { matchLabels: { app: `wordpress-${instanceId}` } },
      template: {
        metadata: { labels: { app: `wordpress-${instanceId}` } },
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

  // Save to the database
  await this.setupRepository.SaveUserWordpress(
    createSetupDto,
    `wordpress-${instanceId}`,
    8081,
    userId,
    '5.8',
  );

  // Retrieve NodePort for WordPress (if exposed as LoadBalancer)
  const wordpressService = await this.k8sService.getService(namespace, `wordpress-${instanceId}`);
  const nodePort = wordpressService.spec.ports.find(port => port.port === 8081)?.nodePort;

  return {
    namespace,
    wordpressUrl: `http://<node-ip>:${nodePort}`, // Replace <node-ip> with your cluster's node IP
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