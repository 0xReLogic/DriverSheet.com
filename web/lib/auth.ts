import type { Account, AuthOptions, Profile, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import { upsertUser } from "./backend";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: requiredEnv("GOOGLE_CLIENT_ID"),
      clientSecret: requiredEnv("GOOGLE_CLIENT_SECRET"),
    }),
  ],
  pages: {
    signIn: "/auth",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({
      token,
      account,
      profile,
      trigger,
      session,
    }: {
      token: JWT;
      account: Account | null;
      profile?: Profile;
      trigger?: "signIn" | "signUp" | "signOut" | "update";
      session?: Session | Record<string, unknown>;
    }): Promise<JWT> {
      if (trigger === "update" && session) {
        const data = session as Record<string, unknown>;
        token.sheetId = (data.sheetId as string | null | undefined) ?? token.sheetId ?? null;
        token.forwardAddress = (data.forwardAddress as string | undefined) ?? token.forwardAddress;
        token.paid = (data.paid as boolean | undefined) ?? token.paid ?? false;
        token.trialExpired = (data.trialExpired as boolean | undefined) ?? token.trialExpired ?? false;
        token.lemonPaymentUrl =
          (data.lemonPaymentUrl as string | undefined) ?? token.lemonPaymentUrl ?? "";
      }

      const shouldSync = !!account || token.userId === undefined;

      if (shouldSync) {
        const googleId = (profile as { sub?: string } | null | undefined)?.sub ?? token.sub ?? "";
        const email =
          (profile as { email?: string } | null | undefined)?.email ??
          (token.email as string | undefined) ??
          "";

        if (!googleId || !email) {
          return token;
        }

        try {
          const backendUser = await upsertUser({ googleId, email });
          token.userId = backendUser.id;
          token.googleId = backendUser.googleId;
          token.email = backendUser.email;
          token.forwardAddress = backendUser.forwardAddress;
          token.sheetId = backendUser.sheetId;
          token.paid = backendUser.paid;
          token.trialExpired = backendUser.trialExpired;
          token.lemonPaymentUrl = backendUser.lemonPaymentUrl;
          token.created = backendUser.created;
        } catch (error) {
          console.error("Failed to sync user with backend", error);
        }
      }

      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }): Promise<Session> {
      if (session.user) {
        session.user.id = token.userId as number;
        session.user.googleId = token.googleId as string;
        session.user.email = (token.email as string) ?? session.user.email ?? "";
        session.user.forwardAddress = (token.forwardAddress as string) ?? "";
        session.user.sheetId = (token.sheetId as string | null | undefined) ?? null;
        session.user.paid = (token.paid as boolean | undefined) ?? false;
        session.user.trialExpired = (token.trialExpired as boolean | undefined) ?? false;
        session.user.lemonPaymentUrl = (token.lemonPaymentUrl as string | undefined) ?? "";
        session.user.created = (token.created as string | undefined) ?? "";
      }
      return session;
    },
  },
};
