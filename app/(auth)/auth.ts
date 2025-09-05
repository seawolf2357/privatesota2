import NextAuth, { type DefaultSession } from 'next-auth';
import Google from 'next-auth/providers/google';
import { createGuestUser, getUser } from '@/lib/db/queries';
import { authConfig } from './auth.config';
import type { DefaultJWT } from 'next-auth/jwt';

export type UserType = 'guest' | 'regular';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      type: UserType;
    } & DefaultSession['user'];
  }

  interface User {
    id?: string;
    email?: string | null;
    type: UserType;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    type: UserType;
  }
}

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // For Google OAuth provider, create user if doesn't exist
      if (account?.provider === 'google') {
        try {
          const { createUser, getUser } = await import('@/lib/db/queries');
          const email = user.email!;
          
          // Check if user already exists
          const existingUsers = await getUser(email);
          
          if (existingUsers.length === 0) {
            // Create new OAuth user without password
            await createUser(email, null);
            console.log(`Created new Google OAuth user: ${email}`);
          }
          
          return true;
        } catch (error) {
          console.error('Error creating Google OAuth user:', error);
          return false;
        }
      }
      
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        // For Google OAuth users, get user from database
        if (account?.provider === 'google') {
          try {
            const { getUser } = await import('@/lib/db/queries');
            const existingUsers = await getUser(user.email!);
            
            if (existingUsers.length > 0) {
              token.id = existingUsers[0].id;
              token.type = 'regular';
            }
          } catch (error) {
            console.error('Error getting Google OAuth user:', error);
          }
        } else {
          token.id = user.id as string;
          token.type = user.type;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.type = token.type;
      }

      return session;
    },
  },
});
