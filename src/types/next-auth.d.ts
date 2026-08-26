import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: string;
    schoolId: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: string;
      schoolId: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    schoolId: string | null;
  }
}

declare module "next-auth/adapters" {
  interface AdapterUser {
    role: string;
    schoolId: string | null;
  }
}
