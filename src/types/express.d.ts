import { IUser } from '../modules/user/User.model';

declare global {
    namespace Express {
        interface User extends IUser { }
    }
}

export { };

