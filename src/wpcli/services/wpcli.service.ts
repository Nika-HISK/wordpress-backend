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
  




  async wpThemeList(
    setupId: number,
    search?: string
  ): Promise<any> {
    const command = 'wp theme list --format=json --allow-root';
  
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

  async wpThemeActivate(setupId: number,theme: string): Promise<string> {
    if (!theme) {
      throw new HttpException('Theme name is required', HttpStatus.BAD_REQUEST);
    }
  
    const command = `wp theme activate ${theme} --allow-root`;
  
    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new Error(`Setup with ID ${setupId} not found`);
    }
  
    return this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, command);
  }

  async wpThemeDisable(setupId: number, theme: string) {
    if (!theme) {
      throw new HttpException('Theme name is required', HttpStatus.BAD_REQUEST);
    }

    const command = `wp theme disable ${theme} --allow-root`;
  
    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new Error(`Setup with ID ${setupId} not found`);
    }
  
    return this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, command);

  }

  async wpThemeDelete(setupId: number, theme: string): Promise<string> {
    if (!theme) {
      throw new HttpException('Theme name is required', HttpStatus.BAD_REQUEST);
    }
  
    await this.wpThemeRepository.deleteThemes(theme);
  
    const command = `wp theme delete ${theme} --allow-root`;
  
    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new Error(`Setup with ID ${setupId} not found`);
    }
  
    return this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, command);
  }


  async wpThemeUpdate(setupId: number, theme: string): Promise<string> {
    if (!theme) {
      throw new HttpException('Theme name is required', HttpStatus.BAD_REQUEST);
    }
  
    const command = `wp theme update ${theme} --allow-root`;
  
    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new Error(`Setup with ID ${setupId} not found`);
    }
  
    return this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, command);
  }


  async wpPluginList(setupId: number, search?: string): Promise<any> {
    const command = 'wp plugin list --status=active,inactive --format=json --allow-root';
  
    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new Error(`Setup with ID ${setupId} not found`);
    }
  
    const output = await this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, command);
    const plugins = JSON.parse(output);
  
    await this.wpPluginRepository.saveUserPlugins(plugins, setupId);
  
    if (search) {
      return plugins.filter(plugin =>
        plugin.name?.toLowerCase().includes(search.toLowerCase())
      );
    }
  
    return plugins;
  }


  async wpPluginActivate(setupId: number, plugin: string): Promise<string> {
    if (!plugin) {
      throw new HttpException('Plugin name is required', HttpStatus.BAD_REQUEST);
    }
  
    const command = `wp plugin activate ${plugin} --allow-root`;
  
    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new Error(`Setup with ID ${setupId} not found`);
    }
  
    return this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, command);
  }


  async wpPluginDeactivate(setupId: number, plugin: string): Promise<string> {
    if (!plugin) {
      throw new HttpException('Plugin name is required', HttpStatus.BAD_REQUEST);
    }
  
    const command = `wp plugin deactivate ${plugin} --allow-root`;
  
    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new Error(`Setup with ID ${setupId} not found`);
    }
  
    return this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, command);
  }

  async wpPluginDelete(setupId: number, plugin: string): Promise<string> {
    if (!plugin) {
      throw new HttpException('Plugin name is required', HttpStatus.BAD_REQUEST);
    }
  
    await this.wpPluginRepository.deletePlugins(plugin);
  
    const command = `wp plugin delete ${plugin} --allow-root`;
  
    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new Error(`Setup with ID ${setupId} not found`);
    }
  
    return this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, command);
  }

  async wpPluginInstall(setupId: number, plugin: string) {
    if (!plugin) {
      throw new HttpException('Plugin name is required', HttpStatus.BAD_REQUEST);
    }
  
    const commandInstall = `wp plugin install ${plugin} --allow-root`;
    const commandSetPermissions = `chown -R www-data:www-data /var/www/html/wp-content/plugins/${plugin}`;
  
    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new Error(`Setup with ID ${setupId} not found`);
    }
  
    try {
      await this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, commandInstall);
      console.log(`Plugin ${plugin} installed successfully`);
  
      await this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, commandSetPermissions);
      console.log(`Permissions set for plugin ${plugin}`);
  
      const commandActivate = `wp plugin activate ${plugin} --allow-root`;
      await this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, commandActivate);
      console.log(`Plugin ${plugin} activated`);
  
    } catch (error) {
      throw new Error(`Failed to install and configure plugin: ${error.message}`);
    }
  }
  
  
  
  
  
  
  

  async wpThemeInstall(setupId: number, theme: string) {
    if (!theme) {
      throw new HttpException('Theme name is required', HttpStatus.BAD_REQUEST);
    }
  
    const commandInstall = `wp theme install ${theme} --allow-root`;
    const commandSetPermissions = `chown -R www-data:www-data /var/www/html/wp-content/themes/${theme}`;
  
    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new Error(`Setup with ID ${setupId} not found`);
    }
  
    try {
      await this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, commandInstall);
      console.log(`Theme ${theme} installed successfully`);
  
      await this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, commandSetPermissions);
      console.log(`Permissions set for theme ${theme}`);
  
      const commandActivate = `wp theme activate ${theme} --allow-root`;
      await this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, commandActivate);
      console.log(`Theme ${theme} activated`);
  
    } catch (error) {
      throw new Error(`Failed to install and configure theme: ${error.message}`);
    }
  }
  

  async wpPluginUpdate(setupId: number, plugin: string): Promise<string> {
    if (!plugin) {
      throw new HttpException('Plugin name is required', HttpStatus.BAD_REQUEST);
    }
  
    const command = `wp plugin update ${plugin} --allow-root`;
  
    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new Error(`Setup with ID ${setupId} not found`);
    }
  
    return this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, command);
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
  
  async wpUserDelete(setupId: number, targetUserId: number): Promise<string> {
    if (!targetUserId) {
      throw new HttpException('Target user ID is required', HttpStatus.BAD_REQUEST);
    }
  
    await this.wpUserRepository.deleteWpUsers(targetUserId);
  
    const command = `wp user delete ${targetUserId} --yes --allow-root`;
  
    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new Error(`Setup with ID ${setupId} not found`);
    }
  
    await this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, command);
  
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

  async wpCoreCheckUpdate(setupId: number): Promise<any> {
    const command = 'wp core check-update --format=json --allow-root';
  
    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new Error(`Setup with ID ${setupId} not found`);
    }
  
    const output = await this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, command);
    const updates = JSON.parse(output);
  
    if (updates.length === 0) {
      return { message: 'No updates available for WordPress core.' };
    }
  
    return updates;
  }

  async wpDbSize(setupId: number): Promise<any> {
    const command = 'wp db size --format=json --allow-root';
  
    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new Error(`Setup with ID ${setupId} not found`);
    }
  
    const output = await this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, command);
    return JSON.parse(output);
  }
  

  async wpRoles(setupId: number): Promise<any> {
    const setup = await this.setupService.findOne(setupId);
  
    const command = 'wp role list --format=json --allow-root';
  
    return this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, command);
  }
  

  async wpCoreVersion(setupId: number): Promise<object> {
    const command = 'wp core version --allow-root';
  
    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new Error(`Setup with ID ${setupId} not found`);
    }
  
    const output = await this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, command);
    const version = { version: output.trim() };
  
    return version;
  }
  async wpGetPhpVersion(setupId: number): Promise<object> {
    const command = 'wp --info --format=json --allow-root';
  
    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new Error(`Setup with ID ${setupId} not found`);
    }
  
    const output = await this.setupService.runKubectlCommand(setup.nameSpace, setup.podName, command);
    const info = JSON.parse(output);
  
    if (!info.php_version) {
      throw new Error('PHP version information not found in WP-CLI output.');
    }
  
    const phpVersion = { phpVersion: info.php_version };
    return phpVersion;
  }
}
