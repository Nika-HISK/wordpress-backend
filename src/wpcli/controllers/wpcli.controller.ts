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
      return {
        status: 'error',
        message: error.message,
      };
    }
  }

  @Roles(Role.USER)
  @ApiWpMaintenance()
  @Patch('maintenance/:mode/:setupId')
  async wpMaintenance(
    @Param('setupId') setupId: number,
    @Param('mode') mode: 'enable' | 'disable',
  ) {
    return this.wpCliService.wpMaintenance(setupId, mode);
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
      return {
        status: 'error',
        message: error.message,
      };
    }
  }

  @Roles(Role.USER)
  @ApiWpThemeList()
  @Get('theme/:setupId')
  async wpThemeList(
    @Param('setupId') setupId: number,
    @Query('search') search?: string,
  ) {
    return this.wpCliService.wpThemeList(setupId, search);
  }

  @Roles(Role.USER)
  @ApiWpThemeActivate()
  @Patch('theme/:setupId')
  async wpThemeActivate(
    @Param('setupId') setupId: number,
    @Body('theme') theme: string,
  ) {
    return this.wpCliService.wpThemeActivate(setupId, theme);
  }

  @Roles(Role.USER)
  @ApiWpThemeDelete()
  @Delete('theme/:setupId')
  async wpThemeDelete(
    @Param('setupId') setupId: number,
    @Body('theme') theme: string,
  ) {
    return this.wpCliService.wpThemeDelete(setupId, theme);
  }

  @Roles(Role.USER)
  @ApiWpThemeUpdate()
  @Put('theme/:setupId')
  async wpThemeUpdate(
    @Param('setupId') setupId: number,
    @Body('theme') theme: string,
  ) {
    return this.wpCliService.wpThemeUpdate(setupId, theme);
  }

  @Roles(Role.USER)
  @ApiWpPluginList()
  @Get('plugin/:setupId')
  async wpPluginList(
    @Param('setupId') setupId: number,
    @Query('search') search?: string,
  ) {
    return this.wpCliService.wpPluginList(setupId, search);
  }

  @Roles(Role.USER)
  @ApiWpPluginActivate()
  @Patch('plugin/enable/:setupId')
  async wpPluginActivate(
    @Param('setupId') setupId: number,
    @Body('plugin') plugin: string,
  ) {
    return this.wpCliService.wpPluginActivate(setupId, plugin);
  }

  @Roles(Role.USER)
  @ApiWpPluginDeactivate()
  @Patch('plugin/disable/:setupId')
  async wpPluginDeactivate(
    @Param('setupId') setupId: number,
    @Body('plugin') plugin: string,
  ) {
    return this.wpCliService.wpPluginDeactivate(setupId, plugin);
  }

  @Roles(Role.USER)
  @ApiWpPluginDelete()
  @Delete('plugin/:setupId')
  async wpPluginDelete(
    @Param('setupId') setupId: number,
    @Body('plugin') plugin: string,
  ) {
    return this.wpCliService.wpPluginDelete(setupId, plugin);
  }

  @Roles(Role.USER)
  @ApiWpPluginUpdate()
  @Put('plugin/:setupId')
  async wpPluginUpdate(
    @Param('setupId') setupId: number,
    @Body('plugin') plugin: string,
  ) {
    return this.wpCliService.wpPluginUpdate(setupId, plugin);
  }

  @Roles(Role.USER)
  @ApiWpUserList()
  @Get('wpuser/:setupId')
  async wpUserList(
    @Param('setupId') setupId: number,
    @Query('search') search?: string,
  ) {
    return this.wpCliService.wpUserList(setupId, search);
  }

  @Roles(Role.USER)
  @ApiWpUserDelete()
  @Delete('wpuser/:setupId')
  async wpUserDelete(
    @Param('setupId') setupId: number,
    @Body('userId') userId: number,
  ) {
    return this.wpCliService.wpUserDelete(setupId, userId);
  }

  @Roles(Role.USER)
  @ApiWpUserRoleUpdate()
  @Patch('wprole/:setupId')
  async wpUserRoleUpdate(
    @Param('setupId') setupId: number,
    @Body('userId') userId: number,
    @Body('role') role: string,
  ) {
    return this.wpCliService.wpUserRoleUpdate(setupId, userId, role);
  }
  @Roles(Role.USER)
  @ApiWpCoreVersion()
  @Get('core/version/:setupId')
  async wpCoreVersion(@Param('setupId') setupId: number) {
    return this.wpCliService.wpCoreVersion(setupId);
  }

  @Roles(Role.USER)
  @ApiWpCoreCheckUpdate()
  @Get('wpcore/check-update/:setupId')
  async wpCoreCheckUpdate(@Param('setupId') setupId: number) {
    return this.wpCliService.wpCoreCheckUpdate(setupId);
  }

  @Roles(Role.USER)
  @ApiWpDbName()
  @Get('db/name/:setupId')
  async wpDbSize(@Param('setupId') setupId: number) {
    return this.wpCliService.wpDbSize(setupId);
  }

  @Roles(Role.USER)
  @ApiWpRoleList()
  @Get('wprole/:setupId')
  async wpRoles(@Param('setupId') setupId: number) {
    return await this.wpCliService.wpRoles(setupId);
  }

  @Roles(Role.USER)
  @ApiWpGetPhpVersion()
  @Get('php/version/:setupId')
  async wpGetPhpVersion(@Param('setupId') setupId: number): Promise<any> {
    return this.wpCliService.wpGetPhpVersion(setupId);
  }
}
