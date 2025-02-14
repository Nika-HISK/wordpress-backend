import { IsString } from "class-validator";


export class CreateLabelDto {
    @IsString()
    label: string
}
