import { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: number;
      googleId: string;
      email: string;
      forwardAddress: string;
      sheetId: string | null;
      paid: boolean;
      trialExpired: boolean;
      lemonPaymentUrl: string;
      created: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: number;
    googleId?: string;
    email?: string;
    forwardAddress?: string;
    sheetId?: string | null;
    paid?: boolean;
    trialExpired?: boolean;
    lemonPaymentUrl?: string;
    created?: string;
  }
}
