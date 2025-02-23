import { Injectable } from '@nestjs/common';
import { CreateFileDto } from '../dto/create-file.dto';
import { UpdateFileDto } from '../dto/update-file.dto';
import { FilesRepository } from '../repositories/files.repository';
import { url } from 'inspector';
import { s3Service } from 'src/aws/services/s3.service';

@Injectable()
export class FilesService {

  constructor(
      private readonly filesRepository:FilesRepository,
      private readonly s3Service: s3Service,
    ) {}

  async uploadFile(
    file: Express.Multer.File,
    userId:number
  ): Promise<{ url: string; key: string; bucket: string }> {
    const fileName = file.originalname;
    const result = await this.s3Service.upload(file, fileName);

    const savedFile = await this.filesRepository.save(
      fileName,
      result.Location,
      result.Key,
      result.Bucket,
      userId
    );

    return {
      url: savedFile.url,
      key: savedFile.key,
      bucket: savedFile.bucket,
    };
  }



}
