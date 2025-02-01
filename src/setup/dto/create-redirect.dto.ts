import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class CreateRedirectDto {
  @IsNotEmpty()
  @IsString()
  setupId: number;

  @IsNotEmpty()
  @IsString()
  oldUrl: string;

  @IsNotEmpty()
  @IsString()
  newUrl: string;

  @IsNotEmpty()
  @IsNumber()
  statusCode: 301 | 302;
}
