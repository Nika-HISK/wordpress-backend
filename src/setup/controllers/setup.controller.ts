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
} from '@nestjs/common';
import { CreateSetupDto } from '../dto/create-setup.dto';
import { UpdateSetupDto } from '../dto/update-setup.dto';
import { SetupService } from '../services/setup.service';
import { AuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { Roles } from 'src/auth/guard/jwt-roles.guard';
import { Role } from 'src/auth/guard/enum/role.enum';


// @UseGuards(AuthGuard)
@Controller('setup')
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  @Roles(Role.USER)
  @Post('wordpress')
  async setupWordpress(@Body() body: CreateSetupDto, @Req() req: any) {
    
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
       req.user.id
      );
     
    } catch (error) {

    }
  }


  // @Roles(Role.USER)
  @Get('wordpress')
  async findAll() {
    return await this.setupService.findAll()
  }

  // @Roles(Role.USER)
  @Get('/wordpress:id')
  async findOne(@Param('id') id: string) {
    return await this.setupService.findOne(Number(id));
  }

  // @Roles(Role.USER)
  @Delete('/wordpress:id')
  async remove(@Param('id') id: string) {
    return await this.setupService.deleteWorpress(Number(id));
  }


  // @Roles(Role.USER)
  @Get('sitetitle')
  async findBytitle() {
    return await this.setupService.findByTitle()
  }
}
