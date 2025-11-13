import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { QueryFilterDto } from './dto/query-filter.dto';
import { parseQuery, toPrismaFilter, ValidationError, ParseError } from 'qast';

// Define allowed fields and operators
const allowedFields = ['id', 'name', 'email', 'age', 'active', 'city'];
const allowedOperators = ['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'in', 'contains'];

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(@Query() query: QueryFilterDto) {
    try {
      // Parse query filter if provided
      let filter: any = {};
      
      if (query.filter) {
        try {
          const ast = parseQuery(query.filter, {
            allowedFields,
            allowedOperators: allowedOperators as any,
            validate: true,
          });
          
          filter = toPrismaFilter(ast);
        } catch (error) {
          if (error instanceof ValidationError) {
            throw new BadRequestException({
              error: 'Validation failed',
              message: error.message,
              field: (error as any).field,
              operator: (error as any).operator,
            });
          } else if (error instanceof ParseError) {
            throw new BadRequestException({
              error: 'Parse error',
              message: error.message,
            });
          }
          throw error;
        }
      }

      return this.usersService.findAll(filter);
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException({
        error: 'Internal server error',
        message: error.message,
      });
    }
  }

  @Get(':id')
  async findOne(@Query('id') id: string) {
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      throw new BadRequestException('Invalid user ID');
    }
    return this.usersService.findOne(userId);
  }
}

