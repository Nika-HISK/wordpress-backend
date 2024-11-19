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
import { LocalAuthGuard } from 'src/auth/guards/local-auth.guard';
import { Roles } from 'src/auth/guards/roles.guard';
import { Role } from 'src/auth/enum/role.enum';


@UseGuards(LocalAuthGuard)
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


}
