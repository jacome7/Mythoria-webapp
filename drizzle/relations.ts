import { relations } from "drizzle-orm/relations";
import { authors, credits, paymentMethods, payments, stories, shippingCodes, addresses, authorCreditBalances, creditLedger, users, sessions, events, characters, storyVersions, storyCharacters, accounts } from "./schema";

export const creditsRelations = relations(credits, ({one}) => ({
	author: one(authors, {
		fields: [credits.authorId],
		references: [authors.authorId]
	}),
}));

export const authorsRelations = relations(authors, ({one, many}) => ({
	credits: many(credits),
	paymentMethods: many(paymentMethods),
	payments: many(payments),
	authorCreditBalances: many(authorCreditBalances),
	creditLedgers: many(creditLedger),
	user: one(users, {
		fields: [authors.userId],
		references: [users.id]
	}),
	addresses: many(addresses),
	events: many(events),
	characters: many(characters),
	stories: many(stories),
}));

export const paymentMethodsRelations = relations(paymentMethods, ({one, many}) => ({
	author: one(authors, {
		fields: [paymentMethods.authorId],
		references: [authors.authorId]
	}),
	payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({one}) => ({
	author: one(authors, {
		fields: [payments.authorId],
		references: [authors.authorId]
	}),
	paymentMethod: one(paymentMethods, {
		fields: [payments.paymentMethodId],
		references: [paymentMethods.paymentMethodId]
	}),
}));

export const shippingCodesRelations = relations(shippingCodes, ({one}) => ({
	story: one(stories, {
		fields: [shippingCodes.storyId],
		references: [stories.storyId]
	}),
	address: one(addresses, {
		fields: [shippingCodes.addressId],
		references: [addresses.addressId]
	}),
}));

export const storiesRelations = relations(stories, ({one, many}) => ({
	shippingCodes: many(shippingCodes),
	creditLedgers: many(creditLedger),
	author: one(authors, {
		fields: [stories.authorId],
		references: [authors.authorId]
	}),
	storyVersions: many(storyVersions),
	storyCharacters: many(storyCharacters),
}));

export const addressesRelations = relations(addresses, ({one, many}) => ({
	shippingCodes: many(shippingCodes),
	author: one(authors, {
		fields: [addresses.authorId],
		references: [authors.authorId]
	}),
}));

export const authorCreditBalancesRelations = relations(authorCreditBalances, ({one}) => ({
	author: one(authors, {
		fields: [authorCreditBalances.authorId],
		references: [authors.authorId]
	}),
}));

export const creditLedgerRelations = relations(creditLedger, ({one}) => ({
	author: one(authors, {
		fields: [creditLedger.authorId],
		references: [authors.authorId]
	}),
	story: one(stories, {
		fields: [creditLedger.storyId],
		references: [stories.storyId]
	}),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	sessions: many(sessions),
	authors: many(authors),
	accounts: many(accounts),
}));

export const eventsRelations = relations(events, ({one}) => ({
	author: one(authors, {
		fields: [events.authorId],
		references: [authors.authorId]
	}),
}));

export const charactersRelations = relations(characters, ({one, many}) => ({
	author: one(authors, {
		fields: [characters.authorId],
		references: [authors.authorId]
	}),
	storyCharacters: many(storyCharacters),
}));

export const storyVersionsRelations = relations(storyVersions, ({one}) => ({
	story: one(stories, {
		fields: [storyVersions.storyId],
		references: [stories.storyId]
	}),
}));

export const storyCharactersRelations = relations(storyCharacters, ({one}) => ({
	story: one(stories, {
		fields: [storyCharacters.storyId],
		references: [stories.storyId]
	}),
	character: one(characters, {
		fields: [storyCharacters.characterId],
		references: [characters.characterId]
	}),
}));

export const accountsRelations = relations(accounts, ({one}) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id]
	}),
}));