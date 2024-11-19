import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setup } from 'src/setup/entities/setup.entity';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as shellEscape from 'shell-escape';

const execAsync = promisify(exec);

@Injectable()
export class wpcliService {
  constructor(
    @InjectRepository(Setup)
    private readonly setupRepository: Repository<Setup>,
  ) {}

  private async getContainerName(userId: number): Promise<string> {
    const setup = await this.setupRepository.findOne({
      where: { userId },
      select: ['containerName'],
    });

    if (!setup) {
      throw new NotFoundException(
        `No WordPress setup found for user ID ${userId}`,
      );
    }

    return setup.containerName;
  }

  async execWpCli(userId: number, command: string): Promise<string> {
    const blockedCommands = ['eval', 'eval-file'];
    const subCommand = command.split(' ')[0];
    if (blockedCommands.includes(subCommand)) {
      throw new HttpException('Command not allowed', HttpStatus.FORBIDDEN);
    }

    const containerName = await this.getContainerName(userId);
    const escapedCommand = shellEscape(command.split(' '));

    try {
      const { stdout, stderr } = await execAsync(
        `docker exec ${containerName} wp ${escapedCommand} --allow-root`,
      );
      if (stderr) {
        console.warn(`WP-CLI stderr: ${stderr}`);
      }
      return stdout.trim();
    } catch (error) {
      console.error(`Command execution failed: ${error.message}`);
      throw new Error(error.message);
    }
  }

  async wpGetMaintenanceStatus(userId: number): Promise<string> {
    const containerName = await this.getContainerName(userId);
    return this.execWpCli(userId, `maintenance-mode status`);
  }

  async wpMaintenance(
    userId: number,
    mode: 'enable' | 'disable',
  ): Promise<string> {
    const containerName = await this.getContainerName(userId);
    const subCommand = mode === 'enable' ? 'activate' : 'deactivate';
    return this.execWpCli(userId, `maintenance-mode ${subCommand}`);
  }

  async wpCacheAdd(
    userId: number,
    key: string,
    data: string,
    group: string,
  ): Promise<string> {
    return this.execWpCli(userId, `cache add ${key} "${data}" ${group}`);
  }

  async wpPlugin(
    userId: number,
    subCommand: string,
    args: string,
  ): Promise<string> {
    const command = `plugin ${subCommand} ${args}`;
    return this.execWpCli(userId, command);
  }
}
