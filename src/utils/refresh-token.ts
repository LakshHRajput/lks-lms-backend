import crypto from "node:crypto";

export const hashRefreshToken = (
  token: string
): string => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};