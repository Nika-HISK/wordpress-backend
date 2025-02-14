import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setup } from 'src/setup/entities/setup.entity';
import { promisify } from 'util';
import { exec } from 'child_process';
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
    private readonly wpPluginRepository: WpPluginRepository,
    private readonly wpThemeRepository: WpThemeRepository,
    private readonly wpUserRepository: WpUserRepository,
    private readonly setupService: SetupService,
  ) {}

  async wpGetMaintenanceStatus(setupId: number) {
    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new HttpException(
        `Setup with ID ${setupId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    const command = 'wp maintenance-mode status --allow-root';
    return this.setupService.runKubectlCommand(
      setup.nameSpace,
      setup.podName,
      command,
    );
  }

  async wpMaintenance(setupId: number, mode: 'enable' | 'disable') {
    const fullCommand =
      mode === 'enable'
        ? 'wp maintenance-mode activate --allow-root'
        : 'wp maintenance-mode deactivate --allow-root';

    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new HttpException(
        `Setup with ID ${setupId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return this.setupService.runKubectlCommand(
      setup.nameSpace,
      setup.podName,
      fullCommand,
    );
  }

  async wpThemeList(setupId: number, search?: string): Promise<any> {
    const command = 'wp theme list --format=json --allow-root';

    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new HttpException(
        `Setup with ID ${setupId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const output = await this.setupService.runKubectlCommand(
      setup.nameSpace,
      setup.podName,
      command,
    );

    const themes = JSON.parse(output);

    await this.wpThemeRepository.saveUserThemes(themes, setupId);

    if (search) {
      return themes.filter((theme) =>
        theme.name?.toLowerCase().includes(search.toLowerCase()),
      );
    }

    return themes;
  }

  async wpThemeActivate(setupId: number, theme: string): Promise<string> {
    if (!theme) {
      throw new HttpException('Theme name is required', HttpStatus.BAD_REQUEST);
    }

    const command = `wp theme activate ${theme} --allow-root`;

    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new HttpException(
        `Setup with ID ${setupId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return this.setupService.runKubectlCommand(
      setup.nameSpace,
      setup.podName,
      command,
    );
  }

  async wpThemeDelete(setupId: number, theme: string): Promise<string> {
    if (!theme) {
      throw new HttpException('Theme name is required', HttpStatus.BAD_REQUEST);
    }

    await this.wpThemeRepository.deleteThemes(theme);

    const command = `wp theme delete ${theme} --allow-root`;

    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new HttpException(
        `Setup with ID ${setupId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return this.setupService.runKubectlCommand(
      setup.nameSpace,
      setup.podName,
      command,
    );
  }

  async wpThemesUpdate(setupId: number, themes: string[]): Promise<string[]> {
    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new HttpException(
        `Setup with ID ${setupId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const results: string[] = [];
    for (const theme of themes) {
      const command = `wp theme update ${theme} --allow-root`;
      try {
        const result = await this.setupService.runKubectlCommand(
          setup.nameSpace,
          setup.podName,
          command,
        );
        results.push(result);
      } catch (error) {
        results.push(`Error updating theme "${theme}": ${error.message}`);
      }
    }

    return results;
  }

  async wpPluginList(setupId: number, search?: string): Promise<any> {
    const command =
      'wp plugin list --status=active,inactive --format=json --allow-root';

    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new HttpException(
        `Setup with ID ${setupId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const output = await this.setupService.runKubectlCommand(
      setup.nameSpace,
      setup.podName,
      command,
    );
    const plugins = JSON.parse(output);

    await this.wpPluginRepository.saveUserPlugins(plugins, setupId);

    if (search) {
      return plugins.filter((plugin) =>
        plugin.name?.toLowerCase().includes(search.toLowerCase()),
      );
    }

    return plugins;
  }

  async wpPluginActivate(
    setupId: number,
    plugins: string[],
  ): Promise<string[]> {
    if (!plugins || plugins.length === 0) {
      throw new HttpException(
        'At least one plugin name is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new HttpException(
        `Setup with ID ${setupId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const results: string[] = [];

    for (const plugin of plugins) {
      const command = `wp plugin activate ${plugin} --allow-root`;
      const result = await this.setupService.runKubectlCommand(
        setup.nameSpace,
        setup.podName,
        command,
      );
      results.push(result);
    }

    return results;
  }

  async wpPluginDeactivate(
    setupId: number,
    plugins: string[],
  ): Promise<string[]> {
    if (!plugins || plugins.length === 0) {
      throw new HttpException(
        'At least one plugin name is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new HttpException(
        `Setup with ID ${setupId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const results: string[] = [];

    for (const plugin of plugins) {
      const command = `wp plugin deactivate ${plugin} --allow-root`;
      const result = await this.setupService.runKubectlCommand(
        setup.nameSpace,
        setup.podName,
        command,
      );
      results.push(result);
    }

    return results;
  }

  async wpPluginDelete(setupId: number, plugin: string): Promise<string> {
    if (!plugin) {
      throw new HttpException(
        'Plugin name is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.wpPluginRepository.deletePlugins(plugin);

    const command = `wp plugin delete ${plugin} --allow-root`;

    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new HttpException(
        `Setup with ID ${setupId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return this.setupService.runKubectlCommand(
      setup.nameSpace,
      setup.podName,
      command,
    );
  }

  async wpPluginsUpdate(setupId: number, plugins: string[]): Promise<string[]> {
    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new HttpException(
        `Setup with ID ${setupId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const results: string[] = [];
    for (const plugin of plugins) {
      const command = `wp plugin update ${plugin} --allow-root`;
      try {
        const result = await this.setupService.runKubectlCommand(
          setup.nameSpace,
          setup.podName,
          command,
        );
        results.push(result);
      } catch (error) {
        results.push(`Error updating plugin "${plugin}": ${error.message}`);
      }
    }

    return results;
  }

  async wpUserList(setupId: number, search?: string): Promise<any> {
    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new HttpException(
        `Setup with ID ${setupId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const command =
      'wp user list --format=json --fields=ID,first_name,last_name,user_email,roles --allow-root';
    const output = await this.setupService.runKubectlCommand(
      setup.nameSpace,
      setup.podName,
      command,
    );
    const wpUsers = JSON.parse(output);

    await this.wpUserRepository.saveWpUsers(wpUsers, setupId);

    if (search) {
      return wpUsers.filter(
        (user) =>
          user.first_name?.toLowerCase().includes(search.toLowerCase()) ||
          user.last_name?.toLowerCase().includes(search.toLowerCase()),
      );
    }
    return wpUsers;
  }

  async wpUsersDelete(setupId: number, userIds: number[]): Promise<string[]> {
    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new HttpException(
        `Setup with ID ${setupId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }
  
    const results: string[] = [];
    for (const userId of userIds) {
      if (!userId) {
        results.push(`Invalid user ID: ${userId}`);
        continue;
      }
  
      const command = `wp user delete ${userId} --yes --allow-root`;
      try {
        // Capture both stdout and stderr from the command
        const result = await this.setupService.runKubectlCommand(
          setup.nameSpace,
          setup.podName,
          command,
        );
  
        // Check for specific warning messages in the output
        if (result.includes("Warning: Invalid user ID, email or login")) {
          results.push(`User with ID ${userId} does not exist.`);
        } else {
          results.push(`User with ID ${userId} has been deleted.`);
        }
      } catch (error) {
        results.push(`Error deleting user with ID ${userId}: ${error.message}`);
      }
    }
  
    return results;
  }
  
  
  async wpUserRoleUpdate(
    setupId: number,
    userId: number,
    role: string,
  ): Promise<any> {
    const setup = await this.setupService.findOne(setupId);

    if (!setup) {
      throw new HttpException(
        `Setup with ID ${setupId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const fullCommand = `wp user get ${userId} --fields=ID --allow-root`;

    const user = await this.setupService.runKubectlCommand(
      setup.nameSpace,
      setup.podName,
      fullCommand,
    );

    if (!user) {
      throw new HttpException(
        `User with ID ${userId} not found in WordPress`,
        HttpStatus.NOT_FOUND,
      );
    }

    const command = `wp user set-role ${userId} ${role} --allow-root`;

    const result = await this.setupService.runKubectlCommand(
      setup.nameSpace,
      setup.podName,
      command,
    );

    return {
      message: `User role updated successfully`,
      result,
    };
  }

  async wpSearchReplace(
    setupId: number,
    search: string,
    replace?: string,
  ) {  
    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new HttpException(
        `Setup with ID ${setupId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    
    let command = '';

    if (!replace) {
      command = `wp search-replace "${search}" '' --dry-run --allow-root`;
    }   
    
    if (search && replace) {
      command = `wp search-replace "${search}" '${replace}' --allow-root`;
    }
    
    const lastCommand = await this.setupService.runKubectlCommand(
      setup.nameSpace,
      setup.podName,
      command,
    );
    
    const match = lastCommand.match(/Success: (\d+) replacements to be made/);
    const howMany = match ? parseInt(match[1], 10) : 0;

    console.log(howMany, 'howmanyy');
    
      setup.lastSearched = search
      setup.lastSearchedLength = howMany
    await this.setupRepository.save(setup)
    return lastCommand;
    
  }
  
  

  async wpCoreCheckUpdate(setupId: number): Promise<any> {
    const command = 'wp core check-update --format=json --allow-root';

    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new HttpException(
        `Setup with ID ${setupId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const output = await this.setupService.runKubectlCommand(
      setup.nameSpace,
      setup.podName,
      command,
    );
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
      throw new HttpException(
        `Setup with ID ${setupId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const output = await this.setupService.runKubectlCommand(
      setup.nameSpace,
      setup.podName,
      command,
    );
    return JSON.parse(output);
  }

  async wpRoles(setupId: number): Promise<any> {
    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new HttpException(
        `Setup with ID ${setupId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const command = 'wp role list --format=json --allow-root';

    return this.setupService.runKubectlCommand(
      setup.nameSpace,
      setup.podName,
      command,
    );
  }

  async wpCoreVersion(setupId: number): Promise<object> {
    const command = 'wp core version --allow-root';

    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new HttpException(
        `Setup with ID ${setupId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const output = await this.setupService.runKubectlCommand(
      setup.nameSpace,
      setup.podName,
      command,
    );
    const version = { version: output.trim() };

    return version;
  }

  async wpGetPhpVersion(setupId: number): Promise<object> {
    const command = 'wp --info --format=json --allow-root';

    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new HttpException(
        `Setup with ID ${setupId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const output = await this.setupService.runKubectlCommand(
      setup.nameSpace,
      setup.podName,
      command,
    );
    const info = JSON.parse(output);

    if (!info.php_version) {
      throw new HttpException(
        'PHP version information not found in WP-CLI output.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const phpVersion = { phpVersion: info.php_version };
    return phpVersion;
  }

  async wpBlogname(setupId: number): Promise<object> {
    const command = 'wp option get blogname --allow-root';

    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new HttpException(
        `Setup with ID ${setupId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const output = await this.setupService.runKubectlCommand(
      setup.nameSpace,
      setup.podName,
      command,
    );
    const blogname = { blogname: output.trim() };

    return blogname;
  }

  async wpSiteIconUrl(setupId: number): Promise<object> {
    const command =
      'wp eval "echo wp_get_attachment_url(get_option(\'site_icon\'));" --allow-root';

    const setup = await this.setupService.findOne(setupId);
    if (!setup) {
      throw new HttpException(
        `Setup with ID ${setupId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const output = await this.setupService.runKubectlCommand(
      setup.nameSpace,
      setup.podName,
      command,
    );
    const siteIconUrl = { siteIconUrl: output.trim() };

    return siteIconUrl;
  }
}
