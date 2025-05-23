import { Injectable } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import { MimeType } from 'aws-sdk/clients/kendra';

@Injectable()
export class s3Service {
  private s3Client = new AWS.S3();
  private BucketName: string;
  private region: string;

  constructor() {
     AWS.config.update({
      accessKeyId: process.env.AWS_ACCES_KEY,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
      signatureVersion: 'v2',
      
      
      
    });
    this.s3Client = new AWS.S3()
    this.BucketName = process.env.AWS_S3_BUCKET;
    this.region = process.env.AWS_REGION;
  }

  async upload(file: Express.Multer.File, key: string) {
    const buffer: Buffer = file.buffer;

    const mimeType = file.mimetype;

    const fileKey = key;
    const params = {
      Bucket: this.BucketName,
      Key: fileKey,
      Body: buffer,
      ContentType: mimeType,
      ContentDisposition: 'inline',
      CreateBucketConfiguration: {
        LocationConstraint: this.region,
      },
    };

    

    try {
      return await this.s3Client.upload(params).promise();
    } catch (error) {
      throw error;
    }
  }

  async getPresignedUrl(key: string): Promise<string> {
    const params = {
      Bucket: this.BucketName,
      Key: key,
      Expires: 3600,
    };

    try {
      const url = await this.s3Client.getSignedUrlPromise('getObject', params);
      return url;
    } catch (error) {
      console.error(`Failed to get presigned URL for key ${key}:`, error.stack);
      throw new Error(`Unable to generate presigned URL: ${error.message}`);
    }
  }
}
