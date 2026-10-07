import type {
    NextFunction,
    Request,
    Response
} from "express";

import { verifyAccessToken } from "../utils/jwt.js";

export interface AuthenticatedRequest
    extends Request {
    user?: {
        userId: number;
        role: string;
    };
}

export const authenticate = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const authorization =
            req.headers.authorization;

        if (!authorization) {
            return res.status(401).json({
                success: false,
                message: "Authorization token is required"
            });
        }

        const [type, token] =
            authorization.split(" ");

        if (
            type !== "Bearer" ||
            !token
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid authorization format"
            });
        }

        const payload =
            verifyAccessToken(token);

        req.user = payload;

        next();
    } catch {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired access token"
        });
    }
};

export const authorize = (
    ...allowedRoles: string[]
) => {
    return (
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        if (
            !allowedRoles.includes(req.user.role)
        ) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission"
            });
        }

        next();
    };
};