import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, UseGuards, Req } from '@nestjs/common';
import { FilesService } from '../services/files.service';
import { CreateFileDto } from '../dto/create-file.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from 'src/auth/enum/role.enum';
import { Roles } from 'src/auth/guards/roles.guard';
import { LocalAuthGuard } from 'src/auth/guards/local-auth.guard';

@UseGuards(LocalAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Roles(Role.USER)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    const userId = req.user.id
    
    return await this.filesService.uploadFile(file, userId);
  }

}
