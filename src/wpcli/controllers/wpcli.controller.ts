import { Controller, Body, Post, Req, UseGuards, Param, Get } from '@nestjs/common';
import { LocalAuthGuard } from 'src/auth/guards/local-auth.guard';
import { wpcliService } from '../services/wpcli.service';
import { Roles } from 'src/auth/guards/roles.guard';
import { Role } from 'src/auth/enum/role.enum';



@UseGuards(LocalAuthGuard) 
@Controller('wp-cli')
export class wpcliController {
  constructor(private readonly wpCliService: wpcliService) {}


  @Post('cache/add')
  async wpCacheAdd(
    @Req() req: any,
    @Body('key') key: string,
    @Body('data') data: string,
    @Body('group') group: string,
  ) {
    return this.wpCliService.wpCacheAdd(req.user.id, key, data, group);
  }

  @Roles(Role.USER)
  @Get('maintenance/status')
  async getMaintenanceStatus(@Req() req: any) {
    try {
      const status = await this.wpCliService.wpGetMaintenanceStatus(req.user.id);
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
  async wpMaintenance(@Req() req: any, @Param('mode') mode: 'enable' | 'disable') {
    return this.wpCliService.wpMaintenance(req.user.id, mode);
  }

  @Roles(Role.USER)
  @Post('plugin/:subCommand')
  async wpPlugin(
    @Req() req: any,
    @Param('subCommand') subCommand: string,
    @Body('args') args: string,
  ) {
    return this.wpCliService.wpPlugin(req.user.id, subCommand, args);
  }


  @Roles(Role.USER)
  @Post('search-replace')
  async wpSearchReplace(
    @Req() req: any,
    @Body('search') search: string,
    @Body('replace') replace: string,
    @Body('options') options: Record<string, any>,
  ) {
    try {
      const result = await this.wpCliService.wpSearchReplace(req.user.id, search, replace, options);
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
  async wpThemeList(@Req() req: any) {
    return this.wpCliService.wpThemeList(req.user.id);
  }

  @Roles(Role.USER)
  @Post('theme/activate')
  async wpThemeActivate(@Req() req: any, @Body('theme') theme: string) {
    return this.wpCliService.wpThemeActivate(req.user.id, theme);
  }

  @Roles(Role.USER)
  @Post('theme/delete')
  async wpThemeDelete(@Req() req: any, @Body('theme') theme: string) {
    return this.wpCliService.wpThemeDelete(req.user.id, theme);
  }

  @Roles(Role.USER)
  @Post('theme/update')
  async wpThemeUpdate(@Req() req: any, @Body('theme') theme: string) {
    return this.wpCliService.wpThemeUpdate(req.user.id, theme);
  }


  @Roles(Role.USER)
  @Get('plugin/list')
  async wpPluginList(@Req() req: any) {
    return this.wpCliService.wpPluginList(req.user.id);
  }

  @Roles(Role.USER)
  @Post('plugin/activate')
  async wpPluginActivate(@Req() req: any, @Body('plugin') plugin: string) {
    return this.wpCliService.wpPluginActivate(req.user.id, plugin);
  }

  @Roles(Role.USER)
  @Post('plugin/deactivate')
  async wpPluginDeactivate(@Req() req: any, @Body('plugin') plugin: string) {
    return this.wpCliService.wpPluginDeactivate(req.user.id, plugin);
  }

  @Roles(Role.USER)
  @Post('plugin/delete')
  async wpPluginDelete(@Req() req: any, @Body('plugin') plugin: string) {
    return this.wpCliService.wpPluginDelete(req.user.id, plugin);
  }

  @Roles(Role.USER)
  @Post('plugin/update')
  async wpPluginUpdate(@Req() req: any, @Body('plugin') plugin: string) {
    return this.wpCliService.wpPluginUpdate(req.user.id, plugin);
  }

  @Roles(Role.USER)
  @Get('wpuser/list')
  async wpUserList(@Req() req: any) {
    return this.wpCliService.wpUserList(req.user.id);
  }

  @Roles(Role.USER)
  @Post('wpuser/delete')
  async wpUserDelete(@Req() req: any, @Body('userId') userId: number) {
    return this.wpCliService.wpUserDelete(req.user.id, userId);
  }

  @Roles(Role.USER)
  @Post('wprole/update')
  async wpUserRoleUpdate(@Req() req: any, @Body('userId') userId: number, @Body('role') role: string) {
    return this.wpCliService.wpUserRoleUpdate(req.user.id, userId, role);
  }
  
 
}
