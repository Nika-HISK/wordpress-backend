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
import shellEscape from 'shell-escape';

const execAsync = promisify(exec);

@Injectable()
export class wpcliService {
  constructor(
    @InjectRepository(Setup)
    private readonly setupRepository: Repository<Setup>,
  ) {}

  // Fetch the container name based on user ID
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

  // Execute WP-CLI commands in the user's Docker container
  private async execWpCli(userId: number, command: string): Promise<string> {
    const containerName = await this.getContainerName(userId);

    try {
      const { stdout, stderr } = await execAsync(
        `docker exec ${containerName} wp ${command} --allow-root`,
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
    return this.execWpCli(userId, `maintenance-mode status`);
  }

  async wpMaintenance(
    userId: number,
    mode: 'enable' | 'disable',
  ): Promise<string> {
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
    return this.execWpCli(userId, `plugin ${subCommand} ${args}`);
  }

  async wpThemeList(userId: number): Promise<any> {
    const output = await this.execWpCli(userId, `theme list --format=json`);
    return JSON.parse(output);
  }

  async wpThemeActivate(userId: number, theme: string): Promise<string> {
    if (!theme) {
      throw new HttpException('Theme name is required', HttpStatus.BAD_REQUEST);
    }
    return this.execWpCli(userId, `theme activate ${theme}`);
  }

  async wpThemeDelete(userId: number, theme: string): Promise<string> {
    if (!theme) {
      throw new HttpException('Theme name is required', HttpStatus.BAD_REQUEST);
    }
    return this.execWpCli(userId, `theme delete ${theme}`);
  }

  async wpThemeUpdate(userId: number, theme: string): Promise<string> {
    if (!theme) {
      throw new HttpException('Theme name is required', HttpStatus.BAD_REQUEST);
    }
    return this.execWpCli(userId, `theme update ${theme}`);
  }
  async wpPluginList(userId: number): Promise<any> {
    const output = await this.execWpCli(userId, `plugin list --status=active,inactive --format=json`);
    return JSON.parse(output);
  }

  async wpPluginActivate(userId: number, plugin: string): Promise<string> {
    if (!plugin) {
      throw new HttpException(
        'Plugin name is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.execWpCli(userId, `plugin activate ${plugin}`);
  }

  async wpPluginDeactivate(userId: number, plugin: string): Promise<string> {
    if (!plugin) {
      throw new HttpException(
        'Plugin name is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.execWpCli(userId, `plugin deactivate ${plugin}`);
  }

  async wpPluginDelete(userId: number, plugin: string): Promise<string> {
    if (!plugin) {
      throw new HttpException(
        'Plugin name is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.execWpCli(userId, `plugin delete ${plugin}`);
  }

  async wpPluginUpdate(userId: number, plugin: string): Promise<string> {
    if (!plugin) {
      throw new HttpException(
        'Plugin name is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.execWpCli(userId, `plugin update ${plugin}`);
  }
  async wpUserList(userId: number): Promise<any> {
    const output = await this.execWpCli(userId, 'user list --format=json --fields=ID,first_name,last_name,user_email,roles');
    return JSON.parse(output);
  }

  async wpUserDelete(userId: number, targetUserId: number): Promise<string> {
    await this.execWpCli(userId, `user delete ${targetUserId} --yes`);
    return `User with ID ${targetUserId} has been deleted from WordPress`;
  }

  async wpUserRoleUpdate(
    userId: number,
    targetUserId: number,
    role: string,
  ): Promise<string> {
    const user = await this.execWpCli(userId, `user get ${targetUserId}`);
    if (!user) {
      throw new NotFoundException(
        `User with ID ${targetUserId} not found in WordPress`,
      );
    }

    await this.execWpCli(userId, `user add-role ${targetUserId} ${role}`);
    return `User with ID ${targetUserId} role has been updated to ${role}`;
  }

  async wpSearchReplace(
    userId: number,
    search: string,
    replace: string,
    options: Record<string, any> = {},
  ): Promise<string> {
    const containerName = await this.getContainerName(userId);

    const args: string[] = ['search-replace', search, replace];

    if (options.tables) {
      args.push(...options.tables);
    }

    for (const [key, value] of Object.entries(options)) {
      if (key === 'tables') continue;

      if (typeof value === 'boolean') {
        if (value) args.push(`--${key}`);
      } else if (value !== undefined) {
        args.push(`--${key}=${value}`);
      }
    }

    const escapedCommand = shellEscape(args);

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

  async wpCoreCheckUpdate(userId: number): Promise<any> {
    const output = await this.execWpCli(
      userId,
      'core check-update --format=json --fields=version,update_type',
    );
    return JSON.parse(output);
  }
  async wpDbSize(userId: number): Promise<any> {
    const output = await this.execWpCli(
      userId,
      'db size --format=json',
    );
    return JSON.parse(output);
  }

  async wpRoleList(userId: number): Promise<any> {
    const output = await this.execWpCli(userId, 'role list --format=json');
    return JSON.parse(output);
  }
}
