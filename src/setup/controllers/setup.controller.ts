import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Req,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateSetupDto } from '../dto/create-setup.dto';
import { SetupService } from '../services/setup.service';
import { Roles } from 'src/auth/guard/jwt-roles.guard';
import { Role } from 'src/auth/guard/enum/role.enum';
import { Throttle } from '@nestjs/throttler';
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
    try {
      const response = await this.setupService.setupWordPress(body, userId);
      return {
        message: 'WordPress setup initiated successfully',
        data: response,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'An error occurred while setting up WordPress',
      );
    }
  }

  

  @Throttle({ default: { limit: 1, ttl: 2000 } })
  @Roles(Role.USER)
  @Post('resetSetup/:id')
  async resetSetup(
    @Body('wpAdminPassword') wpAdminPassword: string,
    @Req() req: any,
    @Param('id') setupId: string,
  ) {
    if (!wpAdminPassword || typeof wpAdminPassword !
      == 'string') {
      throw new BadRequestException(
        'Invalid wpAdminPassword: Must be a non-empty string.',
      );
    }

    try {
      return await this.setupService.resetSetup(
        wpAdminPassword,
        req.user.id,
        Number(setupId),
      );
    } catch (error) {
      throw new NotFoundException(`Setup with ID ${setupId} not found`);
    }
  }

  @Roles(Role.USER)
  @Get('metrics/:namespace/:podName')
  async getPodMetrics(
    @Param('namespace') namespace: string,
    @Param('podName') podName: string,
  ) {
    try {
      return await this.k8sService.getPodMetrics(namespace, podName);
    } catch (error) {
      throw new InternalServerErrorException(
        `Unable to fetch metrics for pod ${podName} in namespace ${namespace}`,
      );
    }
  }

  @Roles(Role.USER)
  @Get('dbPassword/:setupId')
  async getDecryptedMysqlPassword(@Param('setupId') setupId: number) {
    try {
      return await this.setupService.getDecryptedMysqlPassword(setupId);
    } catch (error) {
      throw new NotFoundException(`Setup with ID ${setupId} not found`);
    }
  }

  @Roles(Role.USER)
  @Get('/wordpress:id')
  async findOne(@Param('id') id: string) {
    const setupId = Number(id);
    try {
      return await this.setupService.findOne(setupId);
    } catch (error) {
      throw new NotFoundException(`Setup with ID ${setupId} not found`);
    }
  }

  @Roles(Role.USER)
  @Delete('/setup/:id')
  async deleteSetup(@Param('id') id: string) {
    const setupId = Number(id);
    try {
      await this.setupService.deleteSetup(setupId);
      return { message: `Setup with ID ${setupId} deleted successfully` };
    } catch (error) {
      throw new NotFoundException(`Setup with ID ${setupId} not found`);
    }
  }

  @Roles(Role.USER)
  @Get('sitetitle')
  async findBytitle() {
    try {
      return await this.setupService.findByTitle();
    } catch (error) {
      throw new InternalServerErrorException('Unable to fetch site title');
    }
  }

  @Roles(Role.USER)
  @Get('wordpress/port')
  async findByport() {
    try {
      return await this.setupService.findByport();
    } catch (error) {
      throw new InternalServerErrorException('Unable to fetch WordPress port');
    }
  }

  @Roles(Role.USER)
  @Get('wordpress/username')
  async findByusername() {
    try {
      return await this.setupService.findByusername();
    } catch (error) {
      throw new InternalServerErrorException(
        'Unable to fetch WordPress username',
      );
    }
  }
}
