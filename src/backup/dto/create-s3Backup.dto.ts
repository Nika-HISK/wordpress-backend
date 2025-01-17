import { IsBoolean, IsEnum, IsString } from "class-validator";



export class CreateS3BackupDto {
    @IsString()
    bucket: string

    @IsString()
    accessKey: string

    @IsString()
    accessSecretKey: string

    @IsBoolean()
    files: boolean

    @IsBoolean()
    database: boolean


    
    @IsEnum(['weekly', 'monthly'])
    uploadFrequency: string;
    

}
