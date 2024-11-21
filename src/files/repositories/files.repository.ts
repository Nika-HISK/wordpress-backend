import { Injectable, Req } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { FileEntity } from "../entities/file.entity";
import { Repository } from "typeorm";
import { s3Service } from "src/aws/services/s3.service";



@Injectable()
export class FilesRepository {
    constructor(
        @InjectRepository(FileEntity)
        private readonly fileRepository:Repository<FileEntity>,
        private readonly s3Service:s3Service
    ) {}

    async save(name: string, url: string, key: string, bucket: string, userId:number) {
        const newFile = new FileEntity();
    
        newFile.fileName = name;
        newFile.url = url;
        newFile.key = key;
        newFile.bucket = bucket;
        newFile.userId = userId
    
        return await this.fileRepository.save(newFile);
      }
    
}