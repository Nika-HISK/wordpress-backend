import {
  Controller,
  Body,
  Post,
  Req,
  Param,
  Get,
  Query,
  Put,
  Delete,
  Patch,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { wpcliService } from '../services/wpcli.service';
import { Roles } from 'src/auth/guard/jwt-roles.guard';
import { Role } from 'src/auth/guard/enum/role.enum';
import shellEscape from 'shell-escape';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  ApiWpCoreCheckUpdate,
  ApiWpCoreVersion,
  ApiWpDbName,
  ApiWpGetMaintenanceStatus,
  ApiWpGetPhpVersion,
  ApiWpMaintenance,
  ApiWpPluginActivate,
  ApiWpPluginDeactivate,
  ApiWpPluginDelete,
  ApiWpPluginList,
  ApiWpPluginUpdate,
  ApiWpRoleList,
  ApiWpSearchReplace,
  ApiWpThemeActivate,
  ApiWpThemeDelete,
  ApiWpThemeList,
  ApiWpThemeUpdate,
  ApiWpUserDelete,
  ApiWpUserList,
  ApiWpUserRoleUpdate,
} from '../Decorators/wp-cli-swagger.decorator';

@ApiTags('WP CLI')
@ApiBearerAuth()
@Controller('wp-cli')
export class wpcliController {
  constructor(private readonly wpCliService: wpcliService) {}

  @Roles(Role.USER)
  @ApiWpGetMaintenanceStatus()
  @Get('maintenance/status/:setupId')
  async getMaintenanceStatus(@Param('setupId') setupId: number) {
    try {
      const status = await this.wpCliService.wpGetMaintenanceStatus(setupId);
      return {
        status: 'success',
        data: status,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get maintenance status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Roles(Role.USER)
  @ApiWpMaintenance()
  @Patch('maintenance/:mode/:setupId')
  async wpMaintenance(
    @Param('setupId') setupId: number,
    @Param('mode') mode: 'enable' | 'disable',
  ) {
    try {
      return await this.wpCliService.wpMaintenance(setupId, mode);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to toggle maintenance mode',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Roles(Role.USER)
  @ApiWpSearchReplace()
  @Post('search-replace')
  async wpSearchReplace(
    @Query('setupId') setupId: number,
    @Body('search') search: string,
    @Body('replace') replace: string,
    @Body('options') options: Record<string, any>,
  ) {
    try {
      const result = await this.wpCliService.wpSearchReplace(
        setupId,
        search,
        replace,
        options,
      );
      return {
        status: 'success',
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Search and replace failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Roles(Role.USER)
  @ApiWpThemeList()
  @Get('theme/:setupId')
  async wpThemeList(
    @Param('setupId') setupId: number,
    @Query('search') search?: string,
  ) {
    try {
      return await this.wpCliService.wpThemeList(setupId, search);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to list themes',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Roles(Role.USER)
  @ApiWpThemeActivate()
  @Patch('theme/:setupId')
  async wpThemeActivate(
    @Param('setupId') setupId: number,
    @Body('theme') theme: string,
  ) {
    try {
      return await this.wpCliService.wpThemeActivate(setupId, theme);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to activate theme',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Roles(Role.USER)
  @ApiWpThemeDelete()
  @Delete('theme/:setupId')
  async wpThemeDelete(
    @Param('setupId') setupId: number,
    @Body('theme') theme: string,
  ) {
    try {
      return await this.wpCliService.wpThemeDelete(setupId, theme);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete theme',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Roles(Role.USER)
  @ApiWpThemeUpdate()
  @Put('themes/:setupId')
  async wpThemesUpdate(
    @Param('setupId') setupId: number,
    @Body('themes') themes: string[],
  ) {
    if (!Array.isArray(themes) || themes.length === 0) {
      throw new HttpException(
        'Themes array is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.wpCliService.wpThemesUpdate(setupId, themes);
  }

  @Roles(Role.USER)
  @ApiWpPluginList()
  @Get('plugin/:setupId')
  async wpPluginList(
    @Param('setupId') setupId: number,
    @Query('search') search?: string,
  ) {
    try {
      return await this.wpCliService.wpPluginList(setupId, search);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to list plugins',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Roles(Role.USER)
  @ApiWpPluginActivate()
  @Patch('plugin/enable/:setupId')
  async wpPluginActivate(
    @Param('setupId') setupId: number,
    @Body('plugins') plugins: string[],
  ) {
    try {
      return await this.wpCliService.wpPluginActivate(setupId, plugins);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to activate plugins',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  
  @Roles(Role.USER)
  @ApiWpPluginDeactivate()
  @Patch('plugin/disable/:setupId')
  async wpPluginDeactivate(
    @Param('setupId') setupId: number,
    @Body('plugin') plugin: string[],
  ) {
    try {
      return await this.wpCliService.wpPluginDeactivate(setupId, plugin);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to deactivate plugin',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Roles(Role.USER)
  @ApiWpPluginDelete()
  @Delete('plugin/:setupId')
  async wpPluginDelete(
    @Param('setupId') setupId: number,
    @Body('plugin') plugin: string,
  ) {
    try {
      return await this.wpCliService.wpPluginDelete(setupId, plugin);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete plugin',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Roles(Role.USER)
  @ApiWpPluginUpdate()
  @Put('plugins/:setupId')
  async wpPluginsUpdate(
    @Param('setupId') setupId: number,
    @Body('plugins') plugins: string[],
  ) {
    if (!Array.isArray(plugins) || plugins.length === 0) {
      throw new HttpException(
        'Plugins array is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      return await this.wpCliService.wpPluginsUpdate(setupId, plugins);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update plugins',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Roles(Role.USER)
  @ApiWpUserList()
  @Get('wpuser/:setupId')
  async wpUserList(
    @Param('setupId') setupId: number,
    @Query('search') search?: string,
  ) {
    try {
      return await this.wpCliService.wpUserList(setupId, search);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to list users',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Roles(Role.USER)
  @ApiWpUserDelete()
  @Delete('wpuser/:setupId')
  async wpUserDelete(
    @Param('setupId') setupId: number,
    @Body('userId') userId: number,
  ) {
    try {
      return await this.wpCliService.wpUserDelete(setupId, userId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete user',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Roles(Role.USER)
  @ApiWpUserRoleUpdate()
  @Patch('wprole/:setupId')
  async wpUserRoleUpdate(
    @Param('setupId') setupId: number,
    @Body('userId') userId: number,
    @Body('role') role: string,
  ) {
    try {
      return await this.wpCliService.wpUserRoleUpdate(setupId, userId, role);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update user role',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Roles(Role.USER)
  @ApiWpCoreVersion()
  @Get('core/version/:setupId')
  async wpCoreVersion(@Param('setupId') setupId: number) {
    try {
      return await this.wpCliService.wpCoreVersion(setupId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get core version',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Roles(Role.USER)
  @ApiWpCoreCheckUpdate()
  @Get('wpcore/check-update/:setupId')
  async wpCoreCheckUpdate(@Param('setupId') setupId: number) {
    try {
      return await this.wpCliService.wpCoreCheckUpdate(setupId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to check for core update',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Roles(Role.USER)
  @ApiWpDbName()
  @Get('db/name/:setupId')
  async wpDbSize(@Param('setupId') setupId: number) {
    try {
      return await this.wpCliService.wpDbSize(setupId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get database size',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Roles(Role.USER)
  @ApiWpRoleList()
  @Get('wprole/:setupId')
  async wpRoles(@Param('setupId') setupId: number) {
    try {
      return await this.wpCliService.wpRoles(setupId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get user roles',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Roles(Role.USER)
  @ApiWpGetPhpVersion()
  @Get('php/version/:setupId')
  async wpGetPhpVersion(@Param('setupId') setupId: number): Promise<any> {
    try {
      return await this.wpCliService.wpGetPhpVersion(setupId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get PHP version',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
