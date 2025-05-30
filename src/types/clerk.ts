// Types for Clerk user data to improve type safety

export interface ClerkEmailAddress {
  id: string;
  emailAddress: string;
}

export interface ClerkPhoneNumber {
  id: string;
  phoneNumber: string;
}

export interface ClerkUserForSync {
  id: string;
  emailAddresses?: ClerkEmailAddress[];
  phoneNumbers?: ClerkPhoneNumber[];
  primaryEmailAddressId?: string | null;
  primaryPhoneNumberId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}

export interface AuthorSyncData {
  clerkUserId: string;
  email: string;
  displayName: string;
  mobilePhone?: string;
  lastLoginAt: Date;
}
