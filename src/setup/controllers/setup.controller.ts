import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  Req,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { CreateSetupDto } from '../dto/create-setup.dto';
import { SetupService } from '../services/setup.service';
import { Roles } from 'src/auth/guard/jwt-roles.guard';
import { Role } from 'src/auth/guard/enum/role.enum';
import { Throttle } from '@nestjs/throttler';
import { ExtendedRequest } from 'src/auth/dto/extended-request.interface';
import { KubernetesService } from '../services/kubernetes.service';

// @UseGuards(AuthGuard)
@Controller('wordpress')
export class SetupController {
  constructor(
    private readonly setupService: SetupService,
    private readonly k8sService: KubernetesService,
  ) {}

  @Throttle({ default: { limit: 1, ttl: 2000 } })
  @Roles(Role.USER)
  @Post('setup')
  async setupWordpress(@Body() body: CreateSetupDto, @Req() req: any) {
    const userId = req.user.id;
    const response = await this.setupService.setupWordPress(body, userId);
    return {
      message: 'WordPress setup initiated successfully',
      data: response,
    };
  }

  @Throttle({ default: { limit: 1, ttl: 2000 } })
  @Roles(Role.USER)
  @Post('resetSetup/:id')
  async resetSetup(
    @Body('wpAdminPassword') wpAdminPassword: string,
    @Req() req: any,
    @Param('id') setupId: string,
  ) {
    if (!wpAdminPassword || typeof wpAdminPassword !== 'string') {
      throw new BadRequestException(
        'Invalid wpAdminPassword: Must be a non-empty string.',
      );
    }

    return await this.setupService.resetSetup(
      wpAdminPassword,
      req.user.id,
      Number(setupId),
    );
  }

  @Roles(Role.USER)
  @Get('metrics/:namespace/:podName')
  async getPodMetrics(
    @Param('namespace') namespace: string,
    @Param('podName') podName: string,
  ) {
    return await this.k8sService.getPodMetrics(namespace, podName);
  }

  @Roles(Role.USER)
  @Get('dbPassword/:setupId')
  async getDecryptedMysqlPassword(@Param('setupId') setupId: number) {
    return await this.setupService.getDecryptedMysqlPassword(setupId);
  }

  @Roles(Role.USER)
  @Get('/wordpress:id')
  async findOne(@Param('id') id: string) {
    return await this.setupService.findOne(Number(id));
  }

  @Roles(Role.USER)
  @Delete('/setup/:id')
  async deleteSetup(@Param('id') id: string) {
    return await this.setupService.deleteSetup(Number(id));
  }

  @Roles(Role.USER)
  @Get('sitetitle')
  async findBytitle() {
    return await this.setupService.findByTitle();
  }

  @Roles(Role.USER)
  @Get('wordpress/port')
  async findByport() {
    return await this.setupService.findByport();
  }

  @Roles(Role.USER)
  @Get('wordpress/username')
  async findByusername() {
    return await this.setupService.findByusername();
  }
}
