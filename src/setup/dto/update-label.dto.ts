import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateLabelDto {
  @IsString()
  label: string;
}
