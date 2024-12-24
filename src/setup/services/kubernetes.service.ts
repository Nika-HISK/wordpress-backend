import { Injectable, Logger } from '@nestjs/common';
import {
  KubeConfig,
  CoreV1Api,
  AppsV1Api,
  NetworkingV1Api,
} from '@kubernetes/client-node';
import { execSync } from 'child_process';

@Injectable()
export class KubernetesService {
  private readonly logger = new Logger(KubernetesService.name);
  private kubeConfig: KubeConfig;
  private coreApi: CoreV1Api;
  private appsApi: AppsV1Api;
  private networkingApi: NetworkingV1Api;
  private visitCounts: Record<string, number> = {};
  private appsV1Api: AppsV1Api;

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

  // Adding the getPod method to fetch pod details
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

      // Dynamically adjust bandwidth (add 10MB for testing)
      if (bandwidth) {
        bandwidth.receive.bytes += 10 * 1024 * 1024; // Add 10 MB to receive bytes
        bandwidth.transmit.bytes += 10 * 1024 * 1024; // Add 10 MB to transmit bytes
      }

      const totalBandwidthBytes =
        (bandwidth?.receive.bytes || 0) + (bandwidth?.transmit.bytes || 0);
      const totalBandwidthMB = Math.round(totalBandwidthBytes / (1024 * 1024)); // Convert bytes to MB

      // Parse disk usage
      const diskUsageLines = diskUsage.split('\n').slice(1); // Skip header line
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

      // Sum up disk usage across all filesystems
      let totalDiskUsedInMB = 0;

      diskUsageFormatted.forEach((disk) => {
        const used = disk.used.toUpperCase();
        let usedValue = 0;

        // Handle different units (GB, MB, etc.)
        if (used.includes('G')) {
          usedValue = parseFloat(used.replace('G', '')) * 1024; // Convert GB to MB
        } else if (used.includes('M')) {
          usedValue = parseFloat(used.replace('M', ''));
        }

        totalDiskUsedInMB += usedValue;
      });

      // Optionally, dynamically adjust the total disk usage (e.g., add 1GB for testing)
      totalDiskUsedInMB += 1024; // Add 1GB (1024MB) for testing

      return {
        bandwidth: `${totalBandwidthMB} MB`, // Send bandwidth in MB
        totalDiskUsed: `${totalDiskUsedInMB} MB`, // Send total used disk space in MB
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
      // Step 1: Get pod details
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

      // Step 2: Get node details
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
      console.log(`Fetching details for phpMyAdmin service with instanceId: ${instanceId} in namespace: ${namespace}`);
      const phpMyAdminServiceResponse = await this.coreApi.readNamespacedService(
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
}
