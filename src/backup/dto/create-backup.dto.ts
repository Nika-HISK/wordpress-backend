import { IsString } from "class-validator";



export class CreateBackupDto {
    @IsString()
    note:string
}
