import { Controller, Body, Post, Req, Param, Get, Query, Put, Delete, Patch } from '@nestjs/common';
import { wpcliService } from '../services/wpcli.service';
import { Roles } from 'src/auth/guard/jwt-roles.guard';
import { Role } from 'src/auth/guard/enum/role.enum';
import shellEscape from 'shell-escape';

@Controller('wp-cli')
export class wpcliController {
  constructor(private readonly wpCliService: wpcliService) {}

  @Post('cache/add/:setupId')
  async wpCacheAdd(
    @Param('setupId') setupId: number,
    @Req() req: any,
    @Body('key') key: string,
    @Body('data') data: string,
    @Body('group') group: string,
  ) {
    return this.wpCliService.wpCacheAdd(setupId,req.user.id, key, data, group);
  }

  @Roles(Role.USER)
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
  @Patch('maintenance/:mode/:setupId')
  async wpMaintenance(
    @Param('setupId') setupId: number,
    @Param('mode') mode: 'enable' | 'disable',
  ) {
    return this.wpCliService.wpMaintenance(setupId, mode);
  }

  @Roles(Role.USER)
  @Post('search-replace/:setupId')
  async wpSearchReplace(
    @Param('setupId') setupId: number,
    @Body('search') search: string,
    @Body('replace') replace: string,
    @Body('options') options: Record<string, any>,
  ) {
    try {
      const result = await this.wpCliService.wpSearchReplace(setupId,
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
  @Get('theme/:setupId')
  async wpThemeList(@Param('setupId') setupId: number, @Query('search') search?: string) {
    return this.wpCliService.wpThemeList(setupId, search);
  }

  @Roles(Role.USER)
  @Patch('theme/:setupId')
  async wpThemeActivate(@Param('setupId') setupId: number,@Body('theme') theme: string) {
    return this.wpCliService.wpThemeActivate(setupId,theme);
  }

  @Roles(Role.USER)
  @Delete('theme/:setupId')
  async wpThemeDelete(@Param('setupId') setupId: number,@Body('theme') theme: string) {
    return this.wpCliService.wpThemeDelete(setupId,theme);
  }

  @Roles(Role.USER)
  @Put('theme/:setupId')
  async wpThemeUpdate(@Param('setupId') setupId: number, @Body('theme') theme: string) {
    return this.wpCliService.wpThemeUpdate(setupId,theme);
  }

  @Roles(Role.USER)
  @Get('plugin/:setupId')
  async wpPluginList(@Param('setupId') setupId: number, @Query('search') search?: string) {
    return this.wpCliService.wpPluginList(setupId,search);
  }

  @Roles(Role.USER)
  @Patch('plugin/enable/:setupId')
  async wpPluginActivate(@Param('setupId') setupId: number,@Body('plugin') plugin: string) {
    return this.wpCliService.wpPluginActivate(setupId,plugin);
  }

  @Roles(Role.USER)
  @Patch('plugin/disable/:setupId')
  async wpPluginDeactivate(@Param('setupId') setupId: number,@Body('plugin') plugin: string) {
    return this.wpCliService.wpPluginDeactivate(setupId,plugin);
  }

  @Roles(Role.USER)
  @Delete('plugin/:setupId')
  async wpPluginDelete(@Param('setupId') setupId: number,@Body('plugin') plugin: string) {
    return this.wpCliService.wpPluginDelete(setupId, plugin);
  }

  @Roles(Role.USER)
  @Put('plugin/:setupId')
  async wpPluginUpdate(@Param('setupId') setupId: number,@Body('plugin') plugin: string) {
    return this.wpCliService.wpPluginUpdate(setupId,plugin);
  }

  @Roles(Role.USER)
  @Get('wpuser/:setupId')
  async wpUserList(@Param('setupId') setupId: number, @Query('search') search?: string) {
    return this.wpCliService.wpUserList(setupId, search);
  }
  

  @Roles(Role.USER)
  @Delete('wpuser/:setupId')
  async wpUserDelete(@Param('setupId') setupId: number,@Body('userId') userId: number) {
    return this.wpCliService.wpUserDelete(setupId,userId);
  }

  @Roles(Role.USER)
  @Patch('wprole/:setupId')
  async wpUserRoleUpdate(
    @Param('setupId') setupId: number,
    @Body('userId') userId: number,
    @Body('role') role: string,
  ) {
    return this.wpCliService.wpUserRoleUpdate(setupId, userId, role);
  }
  @Roles(Role.USER)
  @Get('core/version/:setupId')
  async wpCoreVersion(@Param('setupId') setupId: number,@Req() req: any) {
    return this.wpCliService.wpCoreVersion(setupId,req.user.id);
  }

  @Roles(Role.USER)
  @Get('wpcore/check-update/:setupId')
  async wpCoreCheckUpdate(@Param('setupId') setupId: number,) {
    return this.wpCliService.wpCoreCheckUpdate(setupId);
  }

  @Roles(Role.USER)
  @Get('db/name/:setupId')
  async wpDbSize(@Param('setupId') setupId: number,) {
    return this.wpCliService.wpDbSize(setupId);
  }

  @Roles(Role.USER)
  @Get('wprole/:setupId')
  async wpRoles(@Param('setupId') setupId: number) {
    return await this.wpCliService.wpRoles(setupId)
  }

  @Roles(Role.USER)
  @Get('php/version/:setupId')
  async wpGetPhpVersion(@Param('setupId') setupId: number,): Promise<any> {
    return this.wpCliService.wpGetPhpVersion(setupId,);
  }
}
