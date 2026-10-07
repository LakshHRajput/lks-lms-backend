import type {
    ErrorRequestHandler,
    NextFunction,
    Request,
    Response
} from "express";

import { ZodError } from "zod";
import { HttpError } from "../utils/http-error.js";

export const errorMiddleware: ErrorRequestHandler = (
    error,
    _req: Request,
    res: Response,
    _next: NextFunction
) => {
    if (error instanceof ZodError) {
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors: error.issues
        });
    }

    if (error instanceof HttpError) {
        return res.status(error.statusCode).json({
            success: false,
            message: error.message
        });
    }

    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
        return res.status(409).json({
            success: false,
            message: "A record with this value already exists"
        });
    }

    console.error(error);

    return res.status(500).json({
        success: false,
        message: "Internal server error"
    });
};