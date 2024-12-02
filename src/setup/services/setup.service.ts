import { Injectable, NotFoundException } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { CreateSetupDto } from '../dto/create-setup.dto';
import { SetupRepository } from '../repositories/setup.repository';
import { YmlService } from 'src/yml/services/yml.service';
import { DockerService } from 'src/docker/services/docker.service';
import { HelperService } from 'src/helper/services/helper.service';

const execAsync = promisify(exec);

@Injectable()
export class SetupService {
  constructor(
    private readonly setupRepository: SetupRepository,
    private readonly ymlService:YmlService,
    private readonly dockerService:DockerService,
    private readonly helperService:HelperService
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

  async setupWordpress(
    config: CreateSetupDto,
    instanceId: string,
    id: number,
  ): Promise<string> {
    const { wpAdminUser, wpAdminPassword, wpAdminEmail, siteTitle } = config;
    const instancePort = await this.getAvailablePort();
    try {
      console.log(`Starting WordPress setup for instance ${instanceId}...`);
      const dockerComposeYml = this.ymlService.generateDockerComposeYml(instanceId, wpAdminPassword, wpAdminUser, siteTitle, instancePort);

      console.log(typeof dockerComposeYml); 
      
      const instanceDir = path.join(
        __dirname,
        `wordpress_instance_${instanceId}`,
      );

      console.log(typeof instanceDir);
    
      await this.helperService.createDirectory(instanceDir)

      const filePath = path.join(instanceDir, 'docker-compose.yml');

      await this.helperService.WriteDockerForDisk(filePath, dockerComposeYml)

      await this.dockerService.start(instanceId, instanceDir)

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

      console.log(
        `WordPress container name for instance ${instanceId}: ${wordpressContainerName}`,
      );

      await this.helperService.istallWpCli(wordpressContainerName, instanceId)
      console.log(`WP-CLI installed in instance ${instanceId}.`);
      await this.sleep(30000);

      await this.helperService.checkWpConfig(wordpressContainerName)
      await this.helperService.createWpConfig(wordpressContainerName, instanceId, siteTitle, wpAdminUser, wpAdminPassword, wpAdminEmail ,instancePort)
      await this.helperService.activatePlugins(wordpressContainerName)

      const wpInfoCmd = `docker exec ${wordpressContainerName} wp --info --json --allow-root`;
      const { stdout: wpInfoJson } = await execAsync(wpInfoCmd);
      const wpInfo = JSON.parse(wpInfoJson);
      const phpVersion = wpInfo.php_version

      await this.setupRepository.SaveUserWordpress(
        config,
        wordpressContainerName,
        instancePort,
        id,
        phpVersion
      );
      return `WordPress setup complete for instance ${instanceId} on port ${instancePort}!`;
    } catch (error) {
      console.error(
        `Error during WordPress setup for instance ${instanceId}:`,
        error,
      );
      throw new Error(`WordPress setup failed for instance ${instanceId}`);
    }
  }

  async deleteSetupById(setupId: number): Promise<string> {
    const setup = await this.setupRepository.findOne(setupId);
    if (!setup) {
      throw new NotFoundException(`Setup with ID ${setupId} not found.`);
    }
  
    const containerName = setup.containerName; 
    const dbContainerName = `${containerName}-db`; 
  
    try {
      await this.helperService.deleteContainerWithVolumes(containerName);
  
      await this.helperService.deleteContainerWithVolumes(dbContainerName);
  
      await this.setupRepository.deleteSetup(setupId);
      console.log(`Soft deleted setup entry with ID ${setupId} from the database.`);
  
      return `Both '${containerName}' and its associated database container '${dbContainerName}' have been successfully deleted.`;
    } catch (error) {
      throw new Error(
        `Failed to delete containers and setup: ${error.message}`
      );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
    return await this.setupRepository.findByport()
  }

  async findByusername(){
    return await this.setupRepository.findByusername()
  }
  
}
