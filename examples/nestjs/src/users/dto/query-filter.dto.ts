import { IsOptional, IsString } from 'class-validator';

export class QueryFilterDto {
  @IsOptional()
  @IsString()
  filter?: string;
}

