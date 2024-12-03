import { IsNotEmpty, IsString } from 'class-validator';

export class WpUserRoleUpdate {
  @IsNotEmpty()
  @IsString()
  role: string;
}
