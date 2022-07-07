import { ProfileService } from './profile.service';
import { ProfileDTO } from './dto/profile.dto';
export declare class ProfileController {
    private profileService;
    constructor(profileService: ProfileService);
    getUser(res: any, params: any): Promise<void>;
    updateUser(res: any, params: any, body: ProfileDTO): Promise<void>;
}
