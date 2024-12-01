import { Controller, Body, Post, Req, Param, Get, Query } from '@nestjs/common';
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
    @Req() req: any,
    @Param('mode') mode: 'enable' | 'disable',
  ) {
    return this.wpCliService.wpMaintenance(setupId,req.user.id, mode);
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
  @Get('theme/list')
  async wpThemeList(@Query('setupId') setupId: number,@Req() req: any, @Query('search') search?: string) {
    return this.wpCliService.wpThemeList(setupId,req.user.id, search);
  }

  @Roles(Role.USER)
  @Post('theme/activate')
  async wpThemeActivate(@Query('setupId') setupId: number,@Req() req: any, @Body('theme') theme: string) {
    return this.wpCliService.wpThemeActivate(setupId,req.user.id, theme);
  }

  @Roles(Role.USER)
  @Post('theme/delete')
  async wpThemeDelete(@Query('setupId') setupId: number,@Req() req: any, @Body('theme') theme: string) {
    return this.wpCliService.wpThemeDelete(setupId,req.user.id, theme);
  }

  @Roles(Role.USER)
  @Post('theme/update')
  async wpThemeUpdate(@Query('setupId') setupId: number,@Req() req: any, @Body('theme') theme: string) {
    return this.wpCliService.wpThemeUpdate(setupId,req.user.id, theme);
  }

  @Roles(Role.USER)
  @Get('plugin/list')
  async wpPluginList(@Query('setupId') setupId: number,@Req() req: any, @Query('search') search?: string) {
    return this.wpCliService.wpPluginList(setupId,req.user.id, search);
  }

  @Roles(Role.USER)
  @Post('plugin/activate')
  async wpPluginActivate(@Query('setupId') setupId: number,@Req() req: any, @Body('plugin') plugin: string) {
    return this.wpCliService.wpPluginActivate(setupId,req.user.id, plugin);
  }

  @Roles(Role.USER)
  @Post('plugin/deactivate')
  async wpPluginDeactivate(@Query('setupId') setupId: number,@Req() req: any, @Body('plugin') plugin: string) {
    return this.wpCliService.wpPluginDeactivate(setupId,req.user.id, plugin);
  }

  @Roles(Role.USER)
  @Post('plugin/delete')
  async wpPluginDelete(@Query('setupId') setupId: number,@Req() req: any, @Body('plugin') plugin: string) {
    return this.wpCliService.wpPluginDelete(setupId,req.user.id, plugin);
  }

  @Roles(Role.USER)
  @Post('plugin/update')
  async wpPluginUpdate(@Query('setupId') setupId: number,@Req() req: any, @Body('plugin') plugin: string) {
    return this.wpCliService.wpPluginUpdate(setupId,req.user.id, plugin);
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
  async wpCoreCheckUpdate(@Query('setupId') setupId: number,@Req() req: any) {
    return this.wpCliService.wpCoreCheckUpdate(setupId,req.user.id);
  }

  @Roles(Role.USER)
  @Get('db/size')
  async wpDbSize(@Query('setupId') setupId: number,@Req() req: any) {
    return this.wpCliService.wpDbSize(setupId,req.user.id);
  }

  @Roles(Role.USER)
  @Get('wprole/list')
  async getRoles(@Query('setupId') setupId: number,@Req() req: any) {
    return this.wpCliService.wpRoleList(setupId,req.user.id);
  }

  @Roles(Role.USER)
  @Get('php/version')
  async wpGetPhpVersion(@Query('setupId') setupId: number,@Req() req: any): Promise<any> {
    return this.wpCliService.wpGetPhpVersion(setupId,req.user.id);
  }
}
