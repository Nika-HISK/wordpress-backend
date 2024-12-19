import { IsString, IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WpSearchReplaceDto {
  @ApiProperty({
    description: 'The search string to be replaced.',
    example: 'http://example-old.com',
  })
  @IsNotEmpty()
  @IsString()
  search: string;

  @ApiProperty({
    description: 'The replacement string.',
    example: 'http://example-new.com',
  })
  @IsNotEmpty()
  @IsString()
  replace: string;

  @ApiProperty({
    description: 'Optional parameters for the search-replace operation.',
    example: {
      regex: true,
      dryRun: false,
    },
  })
  @IsObject()
  options: Record<string, any>;
}
