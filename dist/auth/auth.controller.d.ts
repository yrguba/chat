import { AuthService } from './auth.service';
import { LoginDTO } from './dto/login.dto';
import { PhoneDTO } from './dto/phone.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    send_code(req: any, res: any, body: PhoneDTO): Promise<void>;
    login(req: any, res: any, body: LoginDTO): Promise<void>;
}
