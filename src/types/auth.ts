// Types for Auth0 user data to improve type safety

export interface Auth0EmailAddress {
  id: string;
  emailAddress: string;
}

export interface Auth0PhoneNumber {
  id: string;
  phoneNumber: string;
}

export interface Auth0UserForSync {
  id: string;
  emailAddresses?: Auth0EmailAddress[];
  phoneNumbers?: Auth0PhoneNumber[];
  primaryEmailAddressId?: string | null;
  primaryPhoneNumberId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}

export interface AuthorSyncData {
  auth0UserId: string; // Auth0 user ID (sub claim)
  email: string;
  displayName: string;
  mobilePhone?: string;
  lastLoginAt: Date;
}
