import { IsString } from "class-validator";

export class CreateSetupDto {
    @IsString()
    wpAdminUser:string

    @IsString()
    wpAdminPassword:string

    @IsString()
    wpAdminEmail:string

    @IsString()
    siteTitle:string
}
