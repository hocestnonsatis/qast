import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll(filter?: any) {
    return this.prisma.user.findMany(filter || {});
  }

  findOne(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }
}

