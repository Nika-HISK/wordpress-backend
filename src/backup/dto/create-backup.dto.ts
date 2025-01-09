import { IsOptional, IsString } from "class-validator";



export class CreateBackupDto {
    @IsOptional()
    @IsString()
    note:string
}
