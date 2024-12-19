import { IsString } from "class-validator";


export class wpUser  {
    @IsString()
    first_name:string

    @IsString()
    last_name:string

    @IsString()
    user_email

    @IsString()
    roles:string
}