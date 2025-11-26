import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from '@prisma/client';
import { Cache } from 'cache-manager';
import { v4 as uuidv4 } from 'uuid';
import { LoginDto, RegisterDto } from './dto';
import { PrismaService } from 'nestjs-prisma';
import { compare, hash } from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async register(dto: RegisterDto) {
    // Перевіряємо чи існує користувач
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Хешуємо пароль
    const hashedPassword = await hash(dto.password, 10);

    // Створюємо користувача
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: UserRole.READER,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return this.generateTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user);
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      return null;
    }

    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async generateTokens(
    user: Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'role'>,
  ) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = uuidv4();

    // Зберігаємо refresh token в Redis на 7 днів
    await this.cacheManager.set(
      `refresh_token:${refreshToken}`,
      user.id,
      7 * 24 * 60 * 60 * 1000, // 7 днів
    );

    // Кешуємо дані користувача
    await this.cacheManager.set(
      `user:${user.id}`,
      JSON.stringify(user),
      60 * 60 * 1000, // 1 година
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async refreshAccessToken(refreshToken: string) {
    const userId = await this.cacheManager.get<string>(
      `refresh_token:${refreshToken}`,
    );

    if (!userId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Спробуємо отримати з кешу
    let user: any;
    const cachedUser = await this.cacheManager.get(`user:${userId}`);

    if (cachedUser) {
      user = JSON.parse(cachedUser as string);
    } else {
      user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }
    }

    return this.generateTokens(user);
  }

  async logout(refreshToken: string) {
    await this.cacheManager.del(`refresh_token:${refreshToken}`);
    return { message: 'Logged out successfully' };
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        address: true,
        balance: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            loans: { where: { status: 'ACTIVE' } },
            reservations: { where: { status: 'PENDING' } },
            fines: { where: { status: 'PENDING' } },
            reviews: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async invalidateUserCache(userId: string) {
    await this.cacheManager.del(`user:${userId}`);
  }
}
