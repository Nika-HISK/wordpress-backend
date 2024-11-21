import { Controller, Body, Post, Req, UseGuards, Param, Get } from '@nestjs/common';
import { LocalAuthGuard } from 'src/auth/guards/local-auth.guard';
import { wpcliService } from '../services/wpcli.service';
import { Roles } from 'src/auth/guards/roles.guard';
import { Role } from 'src/auth/enum/role.enum';



@Controller('wp-cli')
@UseGuards(LocalAuthGuard) 
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
  

 
}
