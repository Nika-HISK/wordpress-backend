import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, UseGuards, Req } from '@nestjs/common';
import { FilesService } from '../services/files.service';
import { CreateFileDto } from '../dto/create-file.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from 'src/auth/guards/roles.guard';
import { Role } from 'src/auth/enum/role.enum';

// @UseGuards(LocalAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Roles(Role.USER)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.filesService.uploadFile(file);
  }

}
