
import { Transform } from 'class-transformer';
import { IsDefined, IsNumber } from 'class-validator';

export class SetupIdDto {

  @IsDefined({ message: 'setupId is required' }) // Ensure setupId is defined
  @Transform(({ value }) => Number(value)) // Convert the string to a number
  @IsNumber({}, { message: 'setupId must be a number' }) // Validate as a number
  setupId: number;

}
