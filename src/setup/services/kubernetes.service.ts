import { Injectable, Logger } from '@nestjs/common';
import { KubeConfig, CoreV1Api, AppsV1Api, NetworkingV1Api, V1Namespace, V1Deployment, V1Service, V1Ingress, V1PersistentVolumeClaim } from '@kubernetes/client-node';

@Injectable()
export class KubernetesService {
  private readonly logger = new Logger(KubernetesService.name);

  private kubeConfig: KubeConfig;
  private coreApi: CoreV1Api;
  private appsApi: AppsV1Api;
  private networkingApi: NetworkingV1Api;

  constructor() {
    this.kubeConfig = new KubeConfig();

    // Load the default kubeconfig (ensure `~/.kube/config` exists or you are using in-cluster configuration)
    this.kubeConfig.loadFromDefault();

    this.coreApi = this.kubeConfig.makeApiClient(CoreV1Api);
    this.appsApi = this.kubeConfig.makeApiClient(AppsV1Api);
    this.networkingApi = this.kubeConfig.makeApiClient(NetworkingV1Api);
  }

  /**
   * Creates a namespace in Kubernetes
   *  Name of the namespace
   */
  async createNamespace(namespaceName: string): Promise<void> {
    console.log(namespaceName);
    
    const namespaceManifest: V1Namespace = {
      metadata: {
        name: namespaceName,
      },
    };

    try {
      await this.coreApi.createNamespace(namespaceManifest);
      this.logger.log(`Namespace "${namespaceName}" created successfully.`);
    } catch (error) {
      if (error.body?.reason === 'AlreadyExists') {
        this.logger.warn(`Namespace "${namespaceName}" already exists.`);
      } else {
        this.logger.error(`Failed to create namespace "${namespaceName}"`, error);
        throw new Error(`Failed to create namespace "${namespaceName}": ${error.message}`);
      }
    }
  }

  /**
   * Applies a manifest (resource) to the Kubernetes cluster
   * @param namespace Namespace to deploy the manifest
   * @param manifest Kubernetes resource manifest
   */
  async applyManifest(namespace: string, manifest: any): Promise<void> {
    const kind = manifest.kind;

    try {
      switch (kind) {
        case 'Secret':
          await this.coreApi.createNamespacedSecret(namespace, manifest);
          break;

        case 'PersistentVolumeClaim':
          await this.coreApi.createNamespacedPersistentVolumeClaim(namespace, manifest);
          break;

        case 'Deployment':
          const deploymentManifest: V1Deployment = manifest;
          await this.appsApi.createNamespacedDeployment(namespace, deploymentManifest);
          break;

        case 'Service':
          const serviceManifest: V1Service = manifest;
          await this.coreApi.createNamespacedService(namespace, serviceManifest);
          break;

        case 'Ingress':
          const ingressManifest: V1Ingress = manifest;
          await this.networkingApi.createNamespacedIngress(namespace, ingressManifest);
          break;

        default:
          this.logger.error(`Unsupported Kubernetes resource kind: ${kind}`);
          throw new Error(`Unsupported Kubernetes resource kind: ${kind}`);
      }
      this.logger.log(`${kind} resource applied successfully in namespace "${namespace}".`);
    } catch (error) {
      this.logger.error(`Failed to apply ${kind} in namespace "${namespace}"`, error);
      throw new Error(`Failed to apply ${kind} in namespace "${namespace}": ${error.message}`);
    }
  }
}
