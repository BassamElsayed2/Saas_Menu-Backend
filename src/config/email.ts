import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY || "";

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

// Keep same exported function name to avoid changing server startup flow.
export async function testEmailConnection(): Promise<boolean> {
  if (!isEmailConfigured()) {
    throw new Error("Resend is not configured");
  }
  return true;
}


