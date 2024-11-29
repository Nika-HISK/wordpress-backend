import { IsEnum, IsString } from "class-validator"



export class Theme {
    @IsString()
    name:string

    @IsString()
    status:string

    @IsString()
    update:string

    @IsString()
    version:string

    @IsString()
    update_version:string
    
    @IsEnum(['off', 'on'])
    auto_update:string
}