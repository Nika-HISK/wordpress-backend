import { Controller, Body, Post, Req, Param, Get, Query, Put, Delete, Patch } from '@nestjs/common';
import { wpcliService } from '../services/wpcli.service';
import { Roles } from 'src/auth/guard/jwt-roles.guard';
import { Role } from 'src/auth/guard/enum/role.enum';

@Controller('wp-cli')
export class wpcliController {
  constructor(private readonly wpCliService: wpcliService) {}

  @Post('cache/add')
  async wpCacheAdd(
    @Query('setupId') setupId: number,
    @Req() req: any,
    @Body('key') key: string,
    @Body('data') data: string,
    @Body('group') group: string,
  ) {
    return this.wpCliService.wpCacheAdd(setupId,req.user.id, key, data, group);
  }

  @Roles(Role.USER)
  @Get('maintenance/status')
  async getMaintenanceStatus(@Query('setupId') setupId: number,@Req() req: any) {
    try {
      const status = await this.wpCliService.wpGetMaintenanceStatus(setupId,
        req.user.id,
      );
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
  @Post('maintenance/:mode')
  async wpMaintenance(
    @Query('setupId') setupId: number,
    @Param('mode') mode: 'enable' | 'disable',
  ) {
    return this.wpCliService.wpMaintenance(setupId, mode);
  }

  @Roles(Role.USER)
  @Post('search-replace')
  async wpSearchReplace(
    @Query('setupId') setupId: number,
    @Req() req: any,
    @Body('search') search: string,
    @Body('replace') replace: string,
    @Body('options') options: Record<string, any>,
  ) {
    try {
      const result = await this.wpCliService.wpSearchReplace(setupId,
        req.user.id,
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
  @Get('theme')
  async wpThemeList(@Query('setupId') setupId: number, @Query('search') search?: string) {
    return this.wpCliService.wpThemeList(setupId, search);
  }

  @Roles(Role.USER)
  @Patch('theme')
  async wpThemeActivate(@Query('setupId') setupId: number,@Body('theme') theme: string) {
    return this.wpCliService.wpThemeActivate(setupId,theme);
  }

  @Roles(Role.USER)
  @Delete('theme')
  async wpThemeDelete(@Query('setupId') setupId: number,@Body('theme') theme: string) {
    return this.wpCliService.wpThemeDelete(setupId,theme);
  }

  @Roles(Role.USER)
  @Put('theme')
  async wpThemeUpdate(@Query('setupId') setupId: number, @Body('theme') theme: string) {
    return this.wpCliService.wpThemeUpdate(setupId,theme);
  }

  @Roles(Role.USER)
  @Get('plugin')
  async wpPluginList(@Query('setupId') setupId: number, @Query('search') search?: string) {
    return this.wpCliService.wpPluginList(setupId,search);
  }

  @Roles(Role.USER)
  @Patch('plugin/enable')
  async wpPluginActivate(@Query('setupId') setupId: number,@Body('plugin') plugin: string) {
    return this.wpCliService.wpPluginActivate(setupId,plugin);
  }

  @Roles(Role.USER)
  @Patch('plugin/disable')
  async wpPluginDeactivate(@Query('setupId') setupId: number,@Body('plugin') plugin: string) {
    return this.wpCliService.wpPluginDeactivate(setupId,plugin);
  }

  @Roles(Role.USER)
  @Delete('plugin')
  async wpPluginDelete(@Query('setupId') setupId: number,@Body('plugin') plugin: string) {
    return this.wpCliService.wpPluginDelete(setupId, plugin);
  }

  @Roles(Role.USER)
  @Put('plugin')
  async wpPluginUpdate(@Query('setupId') setupId: number,@Body('plugin') plugin: string) {
    return this.wpCliService.wpPluginUpdate(setupId,plugin);
  }

  @Roles(Role.USER)
  @Get('wpuser/list')
  async wpUserList(@Query('setupId') setupId: number,@Req() req: any, @Query('search') search?: string) {
    return this.wpCliService.wpUserList(setupId,req.user.id, search);
  }
  

  @Roles(Role.USER)
  @Post('wpuser/delete')
  async wpUserDelete(@Query('setupId') setupId: number,@Req() req: any, @Body('userId') userId: number) {
    return this.wpCliService.wpUserDelete(setupId,req.user.id, userId);
  }

  @Roles(Role.USER)
  @Post('wprole/update')
  async wpUserRoleUpdate(
    @Query('setupId') setupId: number,
    @Req() req: any,
    @Body('userId') userId: number,
    @Body('role') role: string,
  ) {
    return this.wpCliService.wpUserRoleUpdate(setupId,req.user.id, userId, role);
  }
  @Roles(Role.USER)
  @Get('core/version')
  async wpCoreVersion(@Query('setupId') setupId: number,@Req() req: any) {
    return this.wpCliService.wpCoreVersion(setupId,req.user.id);
  }

  @Roles(Role.USER)
  @Get('wpcore/check-update')
  async wpCoreCheckUpdate(@Query('setupId') setupId: number,) {
    return this.wpCliService.wpCoreCheckUpdate(setupId);
  }

  @Roles(Role.USER)
  @Get('db/name')
  async wpDbSize(@Query('setupId') setupId: number,) {
    return this.wpCliService.wpDbSize(setupId);
  }

  @Roles(Role.USER)
  @Get('wprole/list')
  async getRoles(@Query('setupId') setupId: number,@Req() req: any) {
    return this.wpCliService.wpRoleList(setupId,req.user.id);
  }

  @Roles(Role.USER)
  @Get('php/version')
  async wpGetPhpVersion(@Query('setupId') setupId: number,): Promise<any> {
    return this.wpCliService.wpGetPhpVersion(setupId,);
  }
}
