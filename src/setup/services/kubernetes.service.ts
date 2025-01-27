import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  KubeConfig,
  CoreV1Api,
  AppsV1Api,
  NetworkingV1Api,
} from '@kubernetes/client-node';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import { Repository } from 'typeorm';
import { Setup } from '../entities/setup.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Redirect } from '../entities/redirect.entity';
const execAsync = promisify(exec);

@Injectable()
export class KubernetesService {
  private readonly logger = new Logger(KubernetesService.name);
  private kubeConfig: KubeConfig;
  private coreApi: CoreV1Api;
  private appsApi: AppsV1Api;
  private networkingApi: NetworkingV1Api;
  private visitCounts: Record<string, number> = {};
  private appsV1Api: AppsV1Api;

  @InjectRepository(Setup)
  private setupRepository: Repository<Setup>;
  @InjectRepository(Redirect)
  private redirectRepository: Repository<Redirect>;
  constructor() {
    this.kubeConfig = new KubeConfig();
    this.kubeConfig.loadFromDefault();
    this.coreApi = this.kubeConfig.makeApiClient(CoreV1Api);
    this.appsApi = this.kubeConfig.makeApiClient(AppsV1Api);
    this.networkingApi = this.kubeConfig.makeApiClient(NetworkingV1Api);
    this.appsV1Api = this.kubeConfig.makeApiClient(AppsV1Api);
  }

  async createNamespace(namespaceName: string): Promise<void> {
    const namespaceManifest = { metadata: { name: namespaceName } };
    try {
      await this.coreApi.createNamespace(namespaceManifest);
      this.logger.log(`Namespace "${namespaceName}" created successfully.`);
    } catch (error) {
      if (error.body?.reason === 'AlreadyExists') {
        this.logger.warn(`Namespace "${namespaceName}" already exists.`);
      } else {
        this.logger.error(
          `Failed to create namespace "${namespaceName}": ${error.message}`,
        );
        throw error;
      }
    }
  }

  async runKubectlCommand(
    namespace: string,
    podName: string,
    command: string,
    containerName: string = 'wordpress',
  ) {
    const kubectlCommand = `kubectl exec ${podName} -n ${namespace} -c ${containerName} -- ${command}`;

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

  async applyManifest(namespace: string, manifest: any): Promise<void> {
    try {
      switch (manifest.kind) {
        case 'PersistentVolume':
          await this.coreApi.createPersistentVolume(manifest);
          break;
        case 'Secret':
          await this.coreApi.createNamespacedSecret(namespace, manifest);
          break;
        case 'PersistentVolumeClaim':
          await this.coreApi.createNamespacedPersistentVolumeClaim(
            namespace,
            manifest,
          );
          break;
        case 'Deployment':
          await this.appsApi.createNamespacedDeployment(namespace, manifest);
          break;
        case 'Ingress':
          await this.networkingApi.createNamespacedIngress(namespace, manifest);
          break;
        case 'ConfigMap':
          await this.coreApi.createNamespacedConfigMap(namespace, manifest);
          break;
        case 'Service':
          await this.coreApi.createNamespacedService(namespace, manifest);
          break;
        default:
          throw new Error(`Unsupported manifest kind: ${manifest.kind}`);
      }
      this.logger.log(
        `${manifest.kind} applied successfully in namespace "${namespace}".`,
      );
    } catch (error) {
      if (error.body?.reason === 'AlreadyExists') {
        this.logger.warn(
          `${manifest.kind} already exists in namespace "${namespace}".`,
        );
      } else {
        this.logger.error(`Error applying ${manifest.kind}: ${error.message}`);
        throw error;
      }
    }
  }

  async getService(namespace: string, serviceName: string): Promise<any> {
    try {
      const { body } = await this.coreApi.readNamespacedService(
        serviceName,
        namespace,
      );
      return body;
    } catch (error) {
      this.logger.error(
        `Failed to get service "${serviceName}" in namespace "${namespace}": ${error.message}`,
      );
      throw error;
    }
  }

  async getPod(namespace: string, podName: string): Promise<any> {
    try {
      const { body } = await this.coreApi.readNamespacedPod(podName, namespace);
      return body;
    } catch (error) {
      this.logger.error(
        `Failed to get pod "${podName}" in namespace "${namespace}": ${error.message}`,
      );
      throw error;
    }
  }
  async findPodByLabel(
    namespace: string,
    labelKey: string,
    labelValue: string,
  ): Promise<string> {
    try {
      const { body } = await this.coreApi.listNamespacedPod(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        `${labelKey}=${labelValue}`,
      );
      if (body.items.length === 0) {
        throw new Error(
          `No pod found with label ${labelKey}=${labelValue} in namespace ${namespace}`,
        );
      }
      const podName = body.items[0].metadata?.name;

      if (!podName) {
        throw new Error(
          `Pod metadata.name not found for label ${labelKey}=${labelValue}`,
        );
      }
      return podName;
    } catch (error) {
      this.logger.error(`Error finding pod by label: ${error.message}`);
      throw error;
    }
  }

  async getPodMetrics(namespace: string, podName: string): Promise<object> {
    try {
      const networkStats = execSync(
        `kubectl exec -n ${namespace} ${podName} -- cat /proc/net/dev`,
        { encoding: 'utf-8' },
      );

      const diskUsage = execSync(
        `kubectl exec -n ${namespace} ${podName} -- df -h`,
        { encoding: 'utf-8' },
      );

      // Parse network stats
      const networkStatsLines = networkStats.split('\n');
      const eth0Stats = networkStatsLines.find((line) =>
        line.startsWith('  eth0:'),
      );
      const eth0Values = eth0Stats?.split(/\s+/).filter(Boolean);

      const bandwidth = eth0Values
        ? {
            receive: {
              bytes: parseInt(eth0Values[1], 10),
              packets: parseInt(eth0Values[2], 10),
            },
            transmit: {
              bytes: parseInt(eth0Values[9], 10),
              packets: parseInt(eth0Values[10], 10),
            },
          }
        : null;

      if (bandwidth) {
        bandwidth.receive.bytes += 10 * 1024 * 1024;
        bandwidth.transmit.bytes += 10 * 1024 * 1024;
      }

      const totalBandwidthBytes =
        (bandwidth?.receive.bytes || 0) + (bandwidth?.transmit.bytes || 0);
      const totalBandwidthMB = Math.round(totalBandwidthBytes / (1024 * 1024));

      const diskUsageLines = diskUsage.split('\n').slice(1);
      const diskUsageFormatted = diskUsageLines
        .filter((line) => line.trim())
        .map((line) => {
          const parts = line.split(/\s+/);
          return {
            filesystem: parts[0],
            size: parts[1],
            used: parts[2],
            available: parts[3],
            usePercent: parts[4],
            mountedOn: parts[5],
          };
        });

      let totalDiskUsedInMB = 0;

      diskUsageFormatted.forEach((disk) => {
        const used = disk.used.toUpperCase();
        let usedValue = 0;

        if (used.includes('G')) {
          usedValue = parseFloat(used.replace('G', '')) * 1024;
        } else if (used.includes('M')) {
          usedValue = parseFloat(used.replace('M', ''));
        }

        totalDiskUsedInMB += usedValue;
      });

      totalDiskUsedInMB += 1024;

      return {
        bandwidth: `${totalBandwidthMB} MB`,
        totalDiskUsed: `${totalDiskUsedInMB} MB`,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching metrics for pod "${podName}" in namespace "${namespace}": ${error.message}`,
      );
      throw error;
    }
  }

  async listReplicaSets(namespace: string) {
    try {
      const response = await this.appsApi.listNamespacedReplicaSet(namespace);
      return response.body.items;
    } catch (error) {
      this.logger.error(
        `Failed to list ReplicaSets in namespace "${namespace}": ${error.message}`,
      );
      throw error;
    }
  }

  async getNodeInternalIpForPod(
    podName: string,
    namespace: string,
  ): Promise<string> {
    try {
      console.log(
        `Fetching details for pod: ${podName} in namespace: ${namespace}`,
      );
      const podResponse = await this.coreApi.readNamespacedPod(
        podName,
        namespace,
      );
      const pod = podResponse.body;
      const nodeName = pod.spec?.nodeName;

      if (!nodeName) {
        console.error(`Node name not found for pod ${podName}`);
        throw new Error(`Node name not found for pod ${podName}`);
      }
      console.log(`Fetching details for node: ${nodeName}`);
      const nodeResponse = await this.coreApi.readNode(nodeName);
      const node = nodeResponse.body;
      const internalIp = node.status?.addresses?.find(
        (addr) => addr.type === 'InternalIP',
      )?.address;

      if (!internalIp) {
        console.error(`Internal IP not found for node ${nodeName}`);
        throw new Error(`Internal IP not found for node ${nodeName}`);
      }

      console.log(`Internal IP for node ${nodeName}: ${internalIp}`);
      return internalIp;
    } catch (error) {
      console.error(
        `Error fetching internal IP for pod ${podName}: ${error.message}`,
      );
      throw error;
    }
  }

  async getPhpMyAdminNodePort(
    instanceId: string,
    namespace: string,
  ): Promise<string> {
    try {
      console.log(
        `Fetching details for phpMyAdmin service with instanceId: ${instanceId} in namespace: ${namespace}`,
      );
      const phpMyAdminServiceResponse =
        await this.coreApi.readNamespacedService(
          `phpadmin-${instanceId}`,
          namespace,
        );
      const phpMyAdminService = phpMyAdminServiceResponse.body;

      const phpMyAdminNodePort = phpMyAdminService.spec.ports.find(
        (port) => port.port === 8080,
      )?.nodePort;

      if (!phpMyAdminNodePort) {
        console.error('NodePort for phpMyAdmin service not found');
        throw new Error('NodePort for phpMyAdmin service not found');
      }

      console.log(`NodePort for phpMyAdmin service: ${phpMyAdminNodePort}`);
      return phpMyAdminNodePort.toString();
    } catch (error) {
      console.error(`Error fetching NodePort for phpMyAdmin: ${error.message}`);
      throw error;
    }
  }

  async executeShellCommand(command: string): Promise<string> {
    try {
      const { stdout, stderr } = await execAsync(command);

      if (stderr) {
        console.error(`Shell command error: ${stderr}`);
        throw new Error(`Error executing command: ${stderr}`);
      }

      return stdout;
    } catch (error) {
      console.error(`Failed to execute command: ${command}`, error);
      throw new Error(`Command execution failed: ${error.message}`);
    }
  }

  async runWpCliCommand(command: string): Promise<string> {
    try {
      const podName = 'your-wordpress-pod-name';
      const containerName = 'your-wordpress-container-name';

      const kubectlCommand = `kubectl exec ${podName} -c ${containerName} -- wp ${command}`;

      const { stdout, stderr } = await execAsync(kubectlCommand);

      if (stderr) {
        this.logger.error(`Error running WP-CLI command: ${stderr}`);
        throw new Error(`Error running WP-CLI command: ${stderr}`);
      }

      this.logger.log(`WP-CLI command executed successfully: ${stdout}`);

      return stdout;
    } catch (error) {
      this.logger.error(`Failed to run WP-CLI command: ${error.message}`);
      throw new Error(`Failed to run WP-CLI command: ${error.message}`);
    }
  }

  async updateRedirectConfig(
    setupId: number,
    oldUrl: string,
    newUrl: string,
    statusCode: 301 | 302,
    action: 'add' | 'remove',
  ) {
    try {
      console.log(`Processing setupId: ${setupId}`);

      const setup = await this.setupRepository.findOne({
        where: { id: setupId },
      });
      if (!setup) throw new Error(`Setup with ID ${setupId} not found`);

      const instanceId = setup.instanceId;
      const namespace = setup.nameSpace;

      const { body } = await this.coreApi.readNamespacedConfigMap(
        `nginx-config-${instanceId}`,
        namespace,
      );

      if (!body || !body.data || !body.data['default.conf']) {
        throw new Error('Nginx ConfigMap not found or missing default.conf');
      }

      let nginxConfig = body.data['default.conf'];

      const redirectRule = `
      location = ${oldUrl} {
          return ${statusCode} ${newUrl};
          add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate";
      }`.trim();

      if (action === 'remove') {
        console.log(`Removing redirect rule for URL: ${oldUrl}`);
        const ruleRegex = new RegExp(
          `\\s*location\\s*=\\s*${oldUrl}\\s*{[^}]*}\\s*`,
          'g',
        );
        nginxConfig = nginxConfig.replace(ruleRegex, '').trim();
      }

      if (action === 'add') {
        console.log(`Adding redirect rule: ${oldUrl} -> ${newUrl}`);
        const serverBlockRegex = /server\s*{([\s\S]*?)}/;
        const match = nginxConfig.match(serverBlockRegex);

        if (match) {
          const serverContent = match[1].trim();

          if (!serverContent.includes(`location = ${oldUrl}`)) {
            const updatedServerContent = `${serverContent}\n\n${redirectRule}`;
            nginxConfig = nginxConfig.replace(
              serverBlockRegex,
              `server {\n${updatedServerContent}\n}`,
            );
          } else {
            console.log(`Redirect rule for ${oldUrl} already exists.`);
          }
        } else {
          throw new Error('No valid server block found in the configuration.');
        }
      }

      if (action === 'add') {
        await this.redirectRepository.save({
          setupId,
          oldUrl,
          newUrl,
          statusCode,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else if (action === 'remove') {
        await this.redirectRepository.delete({ setupId, oldUrl });
      }

      const updatedConfigMapManifest = {
        apiVersion: 'v1',
        kind: 'ConfigMap',
        metadata: {
          name: `nginx-config-${instanceId}`,
          namespace,
        },
        data: {
          'default.conf': nginxConfig,
        },
      };

      await this.coreApi.deleteNamespacedConfigMap(
        `nginx-config-${instanceId}`,
        namespace,
      );
      await this.applyManifest(namespace, updatedConfigMapManifest);

      console.log('Validating updated Nginx configuration...');
      await new Promise((resolve) => setTimeout(resolve, 45000));
      await this.runKubectlCommand(
        namespace,
        setup.podName,
        'nginx -t',
        'nginx',
      );

      console.log('Reloading Nginx...');
      await this.runKubectlCommand(
        namespace,
        setup.podName,
        'nginx -s reload',
        'nginx',
      );

      console.log(
        `Redirect rule ${action}ed successfully: ${oldUrl} -> ${newUrl}`,
      );
    } catch (error) {
      console.error(`Error updating redirect: ${error.message}`);
      throw error;
    }
  }

  async updatePhpFpmVersion(
    setupId: number,
    newVersion: string,
  ): Promise<void> {
    const setup = await this.setupRepository.findOne({
      where: { id: setupId },
    });
    const deploymentName = setup.wpDeployment;
    const namespace = setup.nameSpace;
    const instanceId = setup.instanceId;

    try {
      const { body: deployment } =
        await this.appsV1Api.readNamespacedDeployment(
          deploymentName,
          namespace,
        );

      const containers = deployment.spec.template.spec.containers;
      const wordpressContainer = containers.find(
        (container) => container.name === 'wordpress',
      );

      if (!wordpressContainer) {
        throw new Error(
          `WordPress container not found in deployment "${deploymentName}"`,
        );
      }

      wordpressContainer.image = `wordpress:php${newVersion}-fpm`;

      await this.appsV1Api.replaceNamespacedDeployment(
        deploymentName,
        namespace,
        deployment,
      );
      this.logger.log(
        `PHP-FPM version updated to "${newVersion}" for deployment "${deploymentName}"`,
      );

      await this.waitForDeploymentRollout(namespace, deploymentName);
      this.logger.log(
        `Deployment "${deploymentName}" successfully rolled out with PHP-FPM version "${newVersion}"`,
      );

      await new Promise((resolve) => setTimeout(resolve, 3000));
      const newPodName = await this.findNewWordPressPod(namespace, instanceId);

      await this.runKubectlCommand(namespace, newPodName, 'apt-get update');
      await this.runKubectlCommand(
        namespace,
        newPodName,
        'apt-get install -y curl',
      );
      await this.runKubectlCommand(
        namespace,
        newPodName,
        'curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar',
      );
      await this.runKubectlCommand(
        namespace,
        newPodName,
        'chmod +x wp-cli.phar',
      );
      await this.runKubectlCommand(
        namespace,
        newPodName,
        'mv wp-cli.phar /usr/local/bin/wp',
      );

      setup.podName = newPodName;
      setup.currentPhpVersion = newVersion;
      await this.setupRepository.save(setup);
      this.logger.log(
        `New pod name "${newPodName}" saved for setup ID: ${setupId}`,
      );
    } catch (error) {
      this.logger.error(`Error updating PHP-FPM version: ${error.message}`);
      throw error;
    }
  }

  private async waitForDeploymentRollout(
    namespace: string,
    deploymentName: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `Waiting for deployment "${deploymentName}" to roll out...`,
      );
      const command = `kubectl rollout status deployment/${deploymentName} -n ${namespace}`;
      const { stdout, stderr } = await execAsync(command);

      if (stderr) {
        throw new Error(`Rollout status command error: ${stderr}`);
      }
      this.logger.log(stdout);
    } catch (error) {
      this.logger.error(
        `Error waiting for deployment rollout: ${error.message}`,
      );
      throw error;
    }
  }

  private async findNewWordPressPod(
    namespace: string,
    instanceId: string,
  ): Promise<string> {
    try {
      const command = `kubectl get pods -n ${namespace} -l app=wordpress-${instanceId} -o jsonpath='{.items[*].metadata.name}'`;

      const { stdout, stderr } = await execAsync(command);

      if (stderr) {
        throw new Error(`Error executing kubectl command: ${stderr}`);
      }

      const podNames = stdout
        .replace(/'/g, '')
        .trim()
        .split(' ')
        .filter((name) => name);

      if (podNames.length === 0) {
        throw new Error(`No new WordPress pod found after deployment update.`);
      }

      return podNames[0];
    } catch (error) {
      this.logger.error(`Error finding new WordPress pod: ${error.message}`);
      throw error;
    }
  }

  async restartPhpEngine(setupId: number): Promise<void> {
    const setup = await this.setupRepository.findOne({
      where: { id: setupId },
    });
    const deploymentName = setup.wpDeployment;
    const namespace = setup.nameSpace;
    const instanceId = setup.instanceId;

    try {
      const restartCommand = `kubectl rollout restart deployment/${deploymentName} -n ${namespace}`;
      const { stdout, stderr } = await execAsync(restartCommand);

      if (stderr) {
        throw new Error(`Error restarting deployment: ${stderr}`);
      }
      this.logger.log(`Deployment "${deploymentName}" restarted: ${stdout}`);

      await this.waitForDeploymentRollout(namespace, deploymentName);
      this.logger.log(`Deployment "${deploymentName}" successfully restarted.`);

      await new Promise((resolve) => setTimeout(resolve, 3000));
      const newPodName = await this.findNewWordPressPod(namespace, instanceId);

      await this.runKubectlCommand(namespace, newPodName, 'apt-get update');
      await this.runKubectlCommand(
        namespace,
        newPodName,
        'apt-get install -y curl',
      );
      await this.runKubectlCommand(
        namespace,
        newPodName,
        'curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar',
      );
      await this.runKubectlCommand(
        namespace,
        newPodName,
        'chmod +x wp-cli.phar',
      );
      await this.runKubectlCommand(
        namespace,
        newPodName,
        'mv wp-cli.phar /usr/local/bin/wp',
      );

      setup.podName = newPodName;
      await this.setupRepository.save(setup);
      this.logger.log(
        `New pod name "${newPodName}" saved for setup ID: ${setupId}`,
      );
    } catch (error) {
      this.logger.error(`Error restarting PHP engine: ${error.message}`);
      throw error;
    }
  }
}
