import { IsString } from "class-validator";



export class CreateS3BackupDto {
    @IsString()
    bucket: string

    @IsString()
    accessKey: string

    @IsString()
    accessSecretKey: string
}
