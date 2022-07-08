import { ProfileService } from './profile.service';
import { ProfileDTO } from './dto/profile.dto';
import { JwtService } from '@nestjs/jwt';
export declare class ProfileController {
    private profileService;
    private readonly jwtService;
    constructor(profileService: ProfileService, jwtService: JwtService);
    getUser(res: any, req: any): Promise<void>;
    updateUser(res: any, req: any, body: ProfileDTO): Promise<void>;
}
