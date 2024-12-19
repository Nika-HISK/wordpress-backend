import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class WpCacheAddDto {
  @ApiProperty({
    description: 'The cache key, typically used to identify the cached item.',
    example: 'transient_recent_posts',
  })
  @IsString()
  key: string;

  @ApiProperty({
    description: 'The data to cache, such as serialized WordPress objects or other data.',
    example: '{"post_id": 42, "title": "Hello World", "timestamp": "2024-01-01T12:00:00Z"}',
  })
  @IsString()
  data: string;

  @ApiProperty({
    description: 'The cache group for categorizing cache entries (e.g., options, transients).',
    example: 'transients',
  })
  @IsString()
  group: string;
}