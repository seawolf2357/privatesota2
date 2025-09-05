import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    // Remove custom signIn page since we only use Google OAuth
    // signIn: '/login',
    newUser: '/',
  },
  providers: [
    // added later in auth.ts since it requires bcrypt which is only compatible with Node.js
    // while this file is also used in non-Node.js environments
  ],
  callbacks: {},
} satisfies NextAuthConfig;
