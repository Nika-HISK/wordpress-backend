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
import { WpPluginRepository } from '../repositories/wpPlugin.repository';
import { WpThemeRepository } from '../repositories/wpTheme.repository';
import { WpUserRepository } from '../repositories/wpUser.repository';
import { SetupService } from 'src/setup/services/setup.service';

const execAsync = promisify(exec);

@Injectable()
export class wpcliService {
  constructor(
    @InjectRepository(Setup)
    private readonly setupRepository: Repository<Setup>,
    private readonly wpPluginRepository:WpPluginRepository,
    private readonly wpThemeRepository:WpThemeRepository,
    private readonly wpUserRepository:WpUserRepository,
    private readonly setupService:SetupService
    
  ) {}


  private async getContainerName(
    setupId: number,
    userId: number,
  ): Promise<string> {
    const setup = await this.setupRepository.findOne({
      where: { id: setupId, userId },
      select: ['podName'],
    });

    if (!setup) {
      throw new NotFoundException(
        `No WordPress setup found for setup ID ${setupId} and user ID ${userId}`,
      );
    }

    return setup.podName;
  }


  private async execWpCli(
    setupId: number,
    userId: number,
    command: string,
  ): Promise<string> {
    const containerName = await this.getContainerName(setupId, userId);

    try {
      const { stdout, stderr } = await execAsync(
        `docker exec ${containerName} wp ${command}`,
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

 async wpGetMaintenanceStatus(setupId:number) {
    const setup = await this.setupService.findOne(setupId)
    const command = 'wp maintenance-mode status --allow-root'
    return this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, command)
    
    
  }


  async wpMaintenance(
    setupId: number,
    mode: 'enable' | 'disable',
  ) {
    const fullCommand = mode === 'enable' 
    ? 'wp maintenance-mode activate --allow-root' 
    : 'wp maintenance-mode deactivate --allow-root';
  
    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new Error(`Setup with ID ${setupId} not found`);
    }
  
    return this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, fullCommand);
  }
  

  async wpCacheAdd(
    setupId:number,
    userId: number,
    key: string,
    data: string,
    group: string,
  ): Promise<string> {
    return this.execWpCli(setupId,userId, `cache add ${key} "${data}" ${group}`);
  }



  async wpThemeList(
    setupId: number,
    search?: string
  ): Promise<any> {
    const command = 'wp theme list --format=json';
  
    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new Error(`Setup with ID ${setupId} not found`);
    }
  
    const output = await this.setupService.runKubectlCommand(
      setup.nameSpace,
      setup.podName,
      command
    );
  
    const themes = JSON.parse(output);
  
    await this.wpThemeRepository.saveUserThemes(themes, setupId);
  
    if (search) {
      return themes.filter(theme =>
        theme.name?.toLowerCase().includes(search.toLowerCase())
      );
    }
  
    return themes;
  }
  async wpThemeActivate(setupId:number,userId: number, theme: string): Promise<string> {
    if (!theme) {
      throw new HttpException('Theme name is required', HttpStatus.BAD_REQUEST);
    }
    return this.execWpCli(setupId,userId, `theme activate ${theme}`);
  }

  async wpThemeDelete(setupId:number,userId: number, theme: string): Promise<string> {

    await this.wpThemeRepository.deleteThemes(theme)

    if (!theme) {
      throw new HttpException('Theme name is required', HttpStatus.BAD_REQUEST);
    }
    return this.execWpCli(setupId,userId, `theme delete ${theme}`);
  }

  async wpThemeUpdate(setupId:number,userId: number, theme: string): Promise<string> {
    if (!theme) {
      throw new HttpException('Theme name is required', HttpStatus.BAD_REQUEST);
    }
    return this.execWpCli(setupId,userId, `theme update ${theme}`);
  }
  async wpPluginList(setupId:number,userId: number, search?: string): Promise<any> {
    console.log(setupId);
    
    const command = 'plugin list --status=active,inactive --format=json';
    const output = await this.execWpCli(setupId,userId, command);
    const plugins = JSON.parse(output);

    await this.wpPluginRepository.saveUserPlugins(plugins, setupId)
  
    if (search) {
      return plugins.filter(plugin =>
        plugin.name?.toLowerCase().includes(search.toLowerCase())
      );
    }
    return plugins;
  }
  async wpPluginActivate(setupId:number,userId: number, plugin: string): Promise<string> {
    if (!plugin) {
      throw new HttpException(
        'Plugin name is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.execWpCli(setupId,userId, `plugin activate ${plugin}`);
  }

  async wpPluginDeactivate(setupId:number,userId: number, plugin: string): Promise<string> {
    if (!plugin) {
      throw new HttpException(
        'Plugin name is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.execWpCli(setupId,userId, `plugin deactivate ${plugin}`);
  }

  async wpPluginDelete(setupId:number,userId: number, plugin: string): Promise<string> {
    await this.wpPluginRepository.deletePlugins(plugin)
    
    if (!plugin) {
      throw new HttpException(
        'Plugin name is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.execWpCli(setupId,userId, `plugin delete ${plugin}`);
  }

  async wpPluginUpdate(setupId:number,userId: number, plugin: string): Promise<string> {
    if (!plugin) {
      throw new HttpException(
        'Plugin name is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.execWpCli(setupId,userId, `plugin update ${plugin}`);
  }
  async wpUserList(setupId:number, search?: string): Promise<any> {

    const setup = await this.setupService.findOne(setupId)

    const command = 'wp user list --format=json --fields=ID,first_name,last_name,user_email,roles --allow-root';
    const output = await this.setupService.runKubectlCommand(setup.nameSpace,setup.podName, command);
    const wpUsers = JSON.parse(output);

    await this.wpUserRepository.saveWpUsers(wpUsers, setupId)
  
    if (search) {
      return wpUsers.filter(user =>
        user.first_name?.toLowerCase().includes(search.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(search.toLowerCase())
      );
    }
    return wpUsers;
  }
  
  async wpUserDelete(setupId:number,userId: number, targetUserId: number): Promise<string> {
    await this.wpUserRepository.deleteWpUsers(targetUserId)
    await this.execWpCli(setupId,userId, `user delete ${targetUserId} --yes`);
    return `User with ID ${targetUserId} has been deleted from WordPress`;
  }

  async wpUserRoleUpdate(
    setupId: number,
    userId: number,
    role: string,
  ): Promise<any> {
    const setup = await this.setupService.findOne(setupId);
  
    if (!setup) {
      throw new NotFoundException(`Setup with ID ${setupId} not found`);
    }
  
    const fullCommand = `wp user get ${userId} --fields=ID --allow-root`

    const user = await this.setupService.runKubectlCommand(
      setup.nameSpace,
      setup.podName,
      fullCommand
    );
  
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found in WordPress`);
    }
  
    const command = `wp user set-role ${userId} ${role} --allow-root`;
  
    const result = await this.setupService.runKubectlCommand(
      setup.nameSpace,
      setup.podName,
      command
    );
  
    return {
      message: `User role updated successfully`,
      result,
    };
  }
  

  async wpSearchReplace(
    setupId: number,
    search: string,
    replace: string,
    options: Record<string, any> = {},
  ) {
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
  
    const setup = await this.setupService.findOne(setupId);
    const command = `wp search-replace ${args.join(' ')} --allow-root`;
  
    return this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, command);
  }

  async wpCoreCheckUpdate(setupId:number,userId: number): Promise<any> {
    const output = await this.execWpCli(setupId,userId, 'core check-update --format=json');
    const updates = JSON.parse(output);
  
    if (updates.length === 0) {
      return { message: 'No updates available for WordPress core.' };
    }
  
    return updates;
  }
  async wpDbSize(setupId:number,userId: number): Promise<any> {
    const output = await this.execWpCli(setupId,
      userId,
      'db size --format=json',
    );
    return JSON.parse(output);
  }

  async wpRoles(setupId: number): Promise<any> {
    const setup = await this.setupService.findOne(setupId);
  
    const command = 'wp role list --allow-root';
  
    return this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, command);
  }
  

  async wpCoreVersion(setupId:number,userId: number): Promise<object> {
    const output = await this.execWpCli(setupId,userId, 'core version');
    const version = {version:output}
    return version
  }

  async wpGetPhpVersion(setupId:number,userId: number): Promise<object> {
    const output = await this.execWpCli(setupId,userId, '--info --format=json');
    const info = JSON.parse(output);
    if (!info.php_version) {
      throw new Error('PHP version information not found in WP-CLI output.');
    }
    const phpVerion = {phpVersion:info.php_version}
    return phpVerion;
  }
}
