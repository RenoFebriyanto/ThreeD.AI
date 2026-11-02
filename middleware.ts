// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { withAuth } from "next-auth/middleware";

const middleware =
  process.env.NODE_ENV === "development"
    ? (_req: NextRequest) => NextResponse.next()
    : withAuth({
        pages: {
          signIn: "/login",
        },
      });

export default middleware;

export const config = {
  matcher: ["/dashboard/:path*"],
};
