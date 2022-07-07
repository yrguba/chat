import { JwtService } from '@nestjs/jwt';
import { UserEntity } from '../database/entities/user.entity';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
export declare class AuthService {
    private jwtService;
    private usersRepository;
    private readonly httpService;
    constructor(jwtService: JwtService, usersRepository: Repository<UserEntity>, httpService: HttpService);
    login(user: any): Promise<Record<string, any>>;
    send_code(phone: string): Promise<Record<string, any>>;
    makeTemporaryPass(length: any): string;
    makeCode(length: any): string;
    post(url: any, data: any, token?: any): Promise<unknown>;
}
