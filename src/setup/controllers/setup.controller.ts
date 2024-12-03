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
} from '@nestjs/common';
import { CreateSetupDto } from '../dto/create-setup.dto';
import { SetupService } from '../services/setup.service';
import { Roles } from 'src/auth/guard/jwt-roles.guard';
import { Role } from 'src/auth/guard/enum/role.enum';
import { Throttle } from '@nestjs/throttler';
import { ExtendedRequest } from 'src/auth/dto/extended-request.interface';


// @UseGuards(AuthGuard)
@Controller('setup')
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  @Throttle({ default: { limit: 1, ttl: 2000 } })
  @Roles(Role.USER)
  @Post('wordpress')
  async setupWordpress(@Body() body: CreateSetupDto, @Req() req: ExtendedRequest) {
    const userId = req.user.id
    
    try {      
      
      const generateInstanceId = (): string => {
        const randomPart = require('crypto').randomBytes(8).toString('hex');
        const timestampPart = Date.now().toString(36);
        return `${randomPart}-${timestampPart}`;
      };
      const instanceId = generateInstanceId();
        await this.setupService.setupWordpress(
        body,
        instanceId,
        userId
      );
     
    } catch (error) {

    }
  }


  @Roles(Role.USER)
  @Get('wordpress')
  async findAll() {
    return await this.setupService.findAll()
  }

  @Roles(Role.USER)
  @Get('/wordpress:id')
  async findOne(@Param('id') id: string) {
    return await this.setupService.findOne(Number(id));
  }

  @Roles(Role.USER)
  @Delete('/wordpress/:id')
  async remove(@Param('id') id: string) {
    return await this.setupService.deleteWordpress(Number(id));
  }


  @Roles(Role.USER)
  @Get('sitetitle')
  async findBytitle() {
    return await this.setupService.findByTitle()
  }
  
  @Roles(Role.USER)
  @Get('wordpress/port')
  async findByport(){
    return await this.setupService.findByport()
  }

  @Roles(Role.USER)
  @Get('wordpress/username')
  async findByusername(){
    return await this.setupService.findByusername()
  }
  @Roles(Role.USER)
  @Delete('wordpress')
  async deleteSetup(@Query('setupId') setupId: number): Promise<string> {
    return this.setupService.deleteSetupById(setupId);
  }
}
