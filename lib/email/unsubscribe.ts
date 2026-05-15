import { createHmac } from "crypto";

const SECRET = process.env.UNSUBSCRIBE_SECRET ?? "dev-secret";

export function generateUnsubscribeToken(userId: string, type: string): string {
  return createHmac("sha256", SECRET)
    .update(`${userId}:${type}`)
    .digest("hex");
}

export function verifyUnsubscribeToken(userId: string, type: string, token: string): boolean {
  return generateUnsubscribeToken(userId, type) === token;
}
