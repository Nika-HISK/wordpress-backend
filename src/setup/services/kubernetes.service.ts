import { Injectable, Logger } from '@nestjs/common';
import {
  KubeConfig,
  CoreV1Api,
  AppsV1Api,
  NetworkingV1Api,
} from '@kubernetes/client-node';

@Injectable()
export class KubernetesService {
  private readonly logger = new Logger(KubernetesService.name);
  private kubeConfig: KubeConfig;
  private coreApi: CoreV1Api;
  private appsApi: AppsV1Api;
  private networkingApi: NetworkingV1Api;

  constructor() {
    this.kubeConfig = new KubeConfig();
    this.kubeConfig.loadFromDefault();
    this.coreApi = this.kubeConfig.makeApiClient(CoreV1Api);
    this.appsApi = this.kubeConfig.makeApiClient(AppsV1Api);
    this.networkingApi = this.kubeConfig.makeApiClient(NetworkingV1Api);
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
        this.logger.error(`Failed to create namespace "${namespaceName}": ${error.message}`);
        throw error;
      }
    }
  }

  async applyManifest(namespace: string, manifest: any): Promise<void> {
    try {
      switch (manifest.kind) {
        case 'Secret':
          await this.coreApi.createNamespacedSecret(namespace, manifest);
          break;
        case 'PersistentVolumeClaim':
          await this.coreApi.createNamespacedPersistentVolumeClaim(namespace, manifest);
          break;
        case 'Deployment':
          await this.appsApi.createNamespacedDeployment(namespace, manifest);
          break;
        case 'Ingress':
          await this.networkingApi.createNamespacedIngress(namespace, manifest);
          break;
        case 'Service':
          await this.coreApi.createNamespacedService(namespace, manifest);
          break;
        default:
          throw new Error(`Unsupported manifest kind: ${manifest.kind}`);
      }
      this.logger.log(`${manifest.kind} applied successfully in namespace "${namespace}".`);
    } catch (error) {
      if (error.body?.reason === 'AlreadyExists') {
        this.logger.warn(`${manifest.kind} already exists in namespace "${namespace}".`);
      } else {
        this.logger.error(`Error applying ${manifest.kind}: ${error.message}`);
        throw error;
      }
    }
  }

  async getService(namespace: string, serviceName: string): Promise<any> {
    try {
      const { body } = await this.coreApi.readNamespacedService(serviceName, namespace);
      return body;
    } catch (error) {
      this.logger.error(`Failed to get service "${serviceName}" in namespace "${namespace}": ${error.message}`);
      throw error;
    }
  }

  // Adding the getPod method to fetch pod details
  async getPod(namespace: string, podName: string): Promise<any> {
    try {
      const { body } = await this.coreApi.readNamespacedPod(podName, namespace);
      return body;
    } catch (error) {
      this.logger.error(`Failed to get pod "${podName}" in namespace "${namespace}": ${error.message}`);
      throw error;
    }
  }
}