import { relations } from "drizzle-orm/relations";
import { authors, addresses, events, stories, storyVersions, characters, credits, paymentMethods, payments, shippingCodes, authorCreditBalances, creditLedger, storyGenerationRuns, storyCharacters, storyGenerationSteps } from "./schema";

export const addressesRelations = relations(addresses, ({one, many}) => ({
	author: one(authors, {
		fields: [addresses.authorId],
		references: [authors.authorId]
	}),
	shippingCodes: many(shippingCodes),
}));

export const authorsRelations = relations(authors, ({many}) => ({
	addresses: many(addresses),
	events: many(events),
	characters: many(characters),
	credits: many(credits),
	paymentMethods: many(paymentMethods),
	payments: many(payments),
	authorCreditBalances: many(authorCreditBalances),
	creditLedgers: many(creditLedger),
	stories: many(stories),
}));

export const eventsRelations = relations(events, ({one}) => ({
	author: one(authors, {
		fields: [events.authorId],
		references: [authors.authorId]
	}),
}));

export const storyVersionsRelations = relations(storyVersions, ({one}) => ({
	story: one(stories, {
		fields: [storyVersions.storyId],
		references: [stories.storyId]
	}),
}));

export const storiesRelations = relations(stories, ({one, many}) => ({
	storyVersions: many(storyVersions),
	shippingCodes: many(shippingCodes),
	creditLedgers: many(creditLedger),
	author: one(authors, {
		fields: [stories.authorId],
		references: [authors.authorId]
	}),
	storyGenerationRuns: many(storyGenerationRuns),
	storyCharacters: many(storyCharacters),
}));

export const charactersRelations = relations(characters, ({one, many}) => ({
	author: one(authors, {
		fields: [characters.authorId],
		references: [authors.authorId]
	}),
	storyCharacters: many(storyCharacters),
}));

export const creditsRelations = relations(credits, ({one}) => ({
	author: one(authors, {
		fields: [credits.authorId],
		references: [authors.authorId]
	}),
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

export const storyGenerationRunsRelations = relations(storyGenerationRuns, ({one, many}) => ({
	story: one(stories, {
		fields: [storyGenerationRuns.storyId],
		references: [stories.storyId]
	}),
	storyGenerationSteps: many(storyGenerationSteps),
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

export const storyGenerationStepsRelations = relations(storyGenerationSteps, ({one}) => ({
	storyGenerationRun: one(storyGenerationRuns, {
		fields: [storyGenerationSteps.runId],
		references: [storyGenerationRuns.runId]
	}),
}));