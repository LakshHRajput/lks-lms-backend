import { z } from "zod";

export const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  role: z
    .enum(["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT", "PARENT"])
    .optional(),
  isActive: z.preprocess(
    (value) => {
      if (typeof value === "string") {
        if (value === "true") return true;
        if (value === "false") return false;
      }
      return value;
    },
    z.boolean().optional()
  )
});

export const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters")
    .max(100),

  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .toLowerCase(),

  password: z
    .string()
    .min(8, "Password must contain at least 8 characters")
    .max(100),

  role: z
    .enum(["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT", "PARENT"])
    .default("STUDENT"),

  phone: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === ""
        ? undefined
        : value,
    z.string().trim().min(10).max(15).optional()
  ),

  isActive: z.boolean().optional().default(true)
});

export const updateUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters")
    .max(100)
    .optional(),

  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .toLowerCase()
    .optional(),

  phone: z.preprocess(
    (value) => {
      if (typeof value === "string" && value.trim() === "") {
        return undefined;
      }
      return value;
    },
    z.string().trim().min(10).max(15).optional()
  ),

  role: z
    .enum(["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT", "PARENT"])
    .optional(),

  isActive: z.boolean().optional()
});

export type UserListQueryInput = z.infer<typeof userListQuerySchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
