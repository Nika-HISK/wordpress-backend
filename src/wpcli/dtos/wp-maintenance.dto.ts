import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WpMaintenanceDto {
  @ApiProperty({
    description: 'The maintenance mode action to perform (enable or disable).',
    example: 'enable',
  })
  @IsNotEmpty()
  @IsEnum(['enable', 'disable'], { message: 'Mode must be either "enable" or "disable".' })
  mode: 'enable' | 'disable';
}