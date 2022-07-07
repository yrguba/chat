import { Repository } from 'typeorm';
import { UserEntity } from '../database/entities/user.entity';
import { ProfileDTO } from './dto/profile.dto';
export declare class ProfileService {
    private usersRepository;
    constructor(usersRepository: Repository<UserEntity>);
    getProfile(id: number): Promise<UserEntity>;
    updateProfile(id: any, profileData: ProfileDTO): Promise<UserEntity>;
}
