import {
  Controller,
  Body,
  Post,
  Req,
  Param,
  Get,
  Query,
  Patch,
  Put,
  Delete,
} from '@nestjs/common';
import { wpcliService } from '../services/wpcli.service';
import { Roles } from 'src/auth/guard/jwt-roles.guard';
import { Role } from 'src/auth/guard/enum/role.enum';
import { ExtendedRequest } from 'src/auth/dto/extended-request.interface';
import { WpMaintenanceDto } from '../dtos/wp-maintenance.dto';
import { SetupIdDto } from '../dtos/setup-id.dto';
import { WpCacheAddDto } from '../dtos/wp-cache-add.dto';
import { WpSearchReplaceDto } from '../dtos/wp-search-replace.dto';
import { WpThemeActivateDto } from '../dtos/wp-theme-activate.dto';
import { WpThemeDeleteDto } from '../dtos/wp-theme-delete.dto';
import { WpThemeUpdateDto } from '../dtos/wp-theme-update.dto';
import { WpSearchQueryDto } from '../dtos/wp-search-query.dto';
import { WpPluginActivateDto } from '../dtos/wp-plugin-activate.dto';
import { WpPluginDeactivateDto } from '../dtos/wp-plugin-deactivate.dto';
import { WpPluginDeleteDto } from '../dtos/wp-plugin-delete.dto';
import { WpPluginUpdateDto } from '../dtos/wp-plugin-update.dto';
import { WpUserIdDto } from '../dtos/wp-user-delete.dto';
import {
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiWpCacheAdd,
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
import { WpUserRoleUpdate } from '../dtos/wp-userrole-update.dto';
import { log } from 'console';

@ApiTags('WP CLI')
@ApiBearerAuth()
@Controller('wp-cli')
export class wpcliController {
  constructor(private readonly wpCliService: wpcliService) {}

  @Roles(Role.USER)
  @ApiWpCacheAdd()
  @Post('cache/add/:setupId')
  async wpCacheAdd(
    @Param() params: SetupIdDto,
    @Req() req: ExtendedRequest,
    @Body() body: WpCacheAddDto,
  ) {
    const { key, data, group } = body;
    const userId = req.user.id;
    const setupId = params.setupId;
    return this.wpCliService.wpCacheAdd(setupId, userId, key, data, group);
  }

  @Roles(Role.USER)
  @ApiWpGetMaintenanceStatus()
  @Get('maintenance/status/:setupId')
  async wpGetMaintenanceStatus(
    @Param() params: SetupIdDto,
    @Req() req: ExtendedRequest,
  ) {
    const userId = req.user.id;
    const setupId = params.setupId;
    try {
      const status = await this.wpCliService.wpGetMaintenanceStatus(
        setupId,
        userId,
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
  @ApiWpMaintenance()
  @Patch('maintenance/:setupId')
  async wpMaintenance(
    @Param() params: SetupIdDto,
    @Req() req: ExtendedRequest,
    @Body() body: WpMaintenanceDto,
  ) {
    const userId = req.user.id;
    const setupId = params.setupId;
    const mode = body.mode;
    return this.wpCliService.wpMaintenance(setupId, userId, mode);
  }

  @Roles(Role.USER)
  @ApiWpSearchReplace()
  @Put('search-replace/:setupId')
  async wpSearchReplace(
    @Param() params: SetupIdDto,
    @Req() req: ExtendedRequest,
    @Body() body: WpSearchReplaceDto,
  ) {
    const userId = req.user.id;
    const { setupId } = params;
    const { search, replace, options } = body;
    try {
      const result = await this.wpCliService.wpSearchReplace(
        setupId,
        userId,
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
    @Param() params: SetupIdDto,
    @Req() req: ExtendedRequest,
    @Query() query: WpSearchQueryDto,
  ) {
    const userId = req.user.id;
    const { search } = query;
    const { setupId } = params;
    return this.wpCliService.wpThemeList(setupId, userId, search);
  }

  @Roles(Role.USER)
  @ApiWpThemeActivate()
  @Patch('theme/activate/:setupId')
  async wpThemeActivate(
    @Param() params: SetupIdDto,
    @Req() req: ExtendedRequest,
    @Body() body: WpThemeActivateDto,
  ) {
    const userId = req.user.id;
    const { setupId } = params;
    const { theme } = body;
    return this.wpCliService.wpThemeActivate(setupId, userId, theme);
  }

  @Roles(Role.USER)
  @ApiWpThemeDelete()
  @Delete('theme/:setupId')
  async wpThemeDelete(
    @Param() params: SetupIdDto,
    @Req() req: ExtendedRequest,
    @Body() body: WpThemeDeleteDto,
  ) {
    const userId = req.user.id;
    const { setupId } = params;
    const theme = body.theme
    console.log(theme);
    
    return this.wpCliService.wpThemeDelete(setupId, userId, theme);
  }

  @Roles(Role.USER)
  @ApiWpThemeUpdate()
  @Put('theme/:setupId')
  async wpThemeUpdate(
    @Param() params: SetupIdDto,
    @Req() req: ExtendedRequest,
    @Query() query: WpThemeUpdateDto,
  ) {
    const userId = req.user.id;
    const { setupId } = params;
    const { theme } = query;
    return this.wpCliService.wpThemeUpdate(setupId, userId, theme);
  }

  @Roles(Role.USER)
  @ApiWpPluginList()
  @Get('plugin/:setupId')
  async wpPluginList(
    @Param() params: SetupIdDto,
    @Req() req: ExtendedRequest,
    @Query() query: WpSearchQueryDto,
  ) {
    const userId = req.user.id;
    const { setupId } = params;
    const { search } = query;
    return this.wpCliService.wpPluginList(setupId, userId, search);
  }

  @Roles(Role.USER)
  @ApiWpPluginActivate()
  @Patch('plugin/activate/:setupId')
  async wpPluginActivate(
    @Param() params: SetupIdDto,
    @Req() req: ExtendedRequest,
    @Query() query: WpPluginActivateDto,
  ) {
    const userId = req.user.id;
    const { setupId } = params;
    const { plugin } = query;
    return this.wpCliService.wpPluginActivate(setupId, userId, plugin);
  }

  @Roles(Role.USER)
  @ApiWpPluginDeactivate()
  @Patch('plugin/deactivate/:setupId')
  async wpPluginDeactivate(
    @Param() params: SetupIdDto,
    @Req() req: ExtendedRequest,
    @Query() query: WpPluginDeactivateDto,
  ) {
    const userId = req.user.id;
    const { setupId } = params;
    const { plugin } = query;
    return this.wpCliService.wpPluginDeactivate(setupId, userId, plugin);
  }

  @Roles(Role.USER)
  @ApiWpPluginDelete()
  @Delete('plugin/:setupId')
  async wpPluginDelete(
    @Param() params: SetupIdDto,
    @Req() req: ExtendedRequest,
    @Body() query: WpPluginDeleteDto,
  ) {
    
    const userId = req.user.id;
    const { setupId } = params;
    const { plugin } = query; 
    return this.wpCliService.wpPluginDelete(setupId, userId, plugin);
  }

  @Roles(Role.USER)
  @ApiWpPluginUpdate()
  @Put('plugin/:setupId')
  async wpPluginUpdate(
    @Param() params: SetupIdDto,
    @Req() req: ExtendedRequest,
    @Query() query: WpPluginUpdateDto,
  ) {
    const userId = req.user.id;
    const { setupId } = params;
    const { plugin } = query;
    
    return this.wpCliService.wpPluginUpdate(setupId, userId, plugin);
  }

  @Roles(Role.USER)
  @ApiWpUserList()
  @Get('wpuser/:setupId')
  async wpUserList(
    @Param() params: SetupIdDto,
    @Req() req: ExtendedRequest,
    @Query() query: WpSearchQueryDto,
  ) {
    const userId = req.user.id;
    const { setupId } = params;
    const { search } = query;
    return this.wpCliService.wpUserList(setupId, userId, search);
  }

  @Roles(Role.USER)
  @ApiWpUserDelete()
  @Delete('wpuser/:setupId')
  async wpUserDelete(
    @Param() params: SetupIdDto,
    @Req() req: ExtendedRequest,
    @Query() query: WpUserIdDto,
  ) {
    const userId = req.user.id;
    const { setupId } = params;
    const { WpUserId } = query;
    return this.wpCliService.wpUserDelete(setupId, userId, WpUserId);
  }

  @Roles(Role.USER)
  @ApiWpUserRoleUpdate()
  @Put('wprole/:setupId/:WpUserId')
  async wpUserRoleUpdate(
    @Param() params: SetupIdDto,
    @Req() req: ExtendedRequest,
    @Param() param: WpUserIdDto,
    @Query() wpRole: WpUserRoleUpdate,
  ) {
    
    const {role} = wpRole
    const userId = req.user.id;
    const { setupId } = params;
    const { WpUserId } = param;
    return this.wpCliService.wpUserRoleUpdate(setupId, userId, WpUserId, role);
  }

  @Roles(Role.USER)
  @ApiWpCoreVersion()
  @Get('core/version/:setupId')
  async wpCoreVersion(
    @Param() params: SetupIdDto,
    @Req() req: ExtendedRequest,
  ) {
    const userId = req.user.id;
    const { setupId } = params;
    return this.wpCliService.wpCoreVersion(setupId, userId);
  }

  @Roles(Role.USER)
  @ApiWpCoreCheckUpdate()
  @Get('wpcore/check-update/:setupId')
  async wpCoreCheckUpdate(
    @Param() params: SetupIdDto,
    @Req() req: ExtendedRequest,
  ) {
    const userId = req.user.id;
    const { setupId } = params;
    return this.wpCliService.wpCoreCheckUpdate(setupId, userId);
  }

  @Roles(Role.USER)
  @ApiWpDbName()
  @Get('db/name/:setupId')
  async wpDbName(@Param() params: SetupIdDto, @Req() req: ExtendedRequest) {
    const userId = req.user.id;
    const { setupId } = params;
    return this.wpCliService.wpDbName(setupId, userId);
  }

  @Roles(Role.USER)
  @ApiWpRoleList()
  @Get('wprole/:setupId')
  async getRoles(@Param() params: SetupIdDto, @Req() req: ExtendedRequest) {
    const userId = req.user.id;
    const { setupId } = params;
    return this.wpCliService.wpRoleList(setupId, userId);
  }

  @Roles(Role.USER)
  @ApiWpGetPhpVersion()
  @Get('php/version/:setupId')
  async wpGetPhpVersion(
    @Param() params: SetupIdDto,
    @Req() req: ExtendedRequest,
  ) {
    const userId = req.user.id;
    const { setupId } = params;
    return this.wpCliService.wpGetPhpVersion(setupId, userId);
  }
}
