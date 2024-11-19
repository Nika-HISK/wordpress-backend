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



@Controller('setup')
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

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
       
      );
     
    } catch (error) {

    }
  }

  @Get()
  findAll() {
    return this.setupService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.setupService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSetupDto: UpdateSetupDto) {
    return this.setupService.update(+id, updateSetupDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.setupService.remove(+id);
  }
}
