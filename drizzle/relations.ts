import { relations } from "drizzle-orm/relations";
import { addresses, printRequests, printProviders, authors, events, stories, storyVersions, credits, paymentMethods, payments, shippingCodes, authorCreditBalances, creditLedger, characters, aiEdits, paymentOrders, paymentEvents, storyCharacters } from "./schema";

export const printRequestsRelations = relations(printRequests, ({one}) => ({
	address: one(addresses, {
		fields: [printRequests.shippingId],
		references: [addresses.addressId]
	}),
	printProvider: one(printProviders, {
		fields: [printRequests.printProviderId],
		references: [printProviders.id]
	}),
}));

export const addressesRelations = relations(addresses, ({one, many}) => ({
	printRequests: many(printRequests),
	author: one(authors, {
		fields: [addresses.authorId],
		references: [authors.authorId]
	}),
	shippingCodes: many(shippingCodes),
}));

export const printProvidersRelations = relations(printProviders, ({many}) => ({
	printRequests: many(printRequests),
}));

export const authorsRelations = relations(authors, ({many}) => ({
	addresses: many(addresses),
	events: many(events),
	credits: many(credits),
	paymentMethods: many(paymentMethods),
	payments: many(payments),
	authorCreditBalances: many(authorCreditBalances),
	creditLedgers: many(creditLedger),
	characters: many(characters),
	stories: many(stories),
	aiEdits: many(aiEdits),
	paymentOrders: many(paymentOrders),
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
	aiEdits: many(aiEdits),
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

export const charactersRelations = relations(characters, ({one, many}) => ({
	author: one(authors, {
		fields: [characters.authorId],
		references: [authors.authorId]
	}),
	storyCharacters: many(storyCharacters),
}));

export const aiEditsRelations = relations(aiEdits, ({one}) => ({
	author: one(authors, {
		fields: [aiEdits.authorId],
		references: [authors.authorId]
	}),
	story: one(stories, {
		fields: [aiEdits.storyId],
		references: [stories.storyId]
	}),
}));

export const paymentOrdersRelations = relations(paymentOrders, ({one, many}) => ({
	author: one(authors, {
		fields: [paymentOrders.authorId],
		references: [authors.authorId]
	}),
	paymentEvents: many(paymentEvents),
}));

export const paymentEventsRelations = relations(paymentEvents, ({one}) => ({
	paymentOrder: one(paymentOrders, {
		fields: [paymentEvents.orderId],
		references: [paymentOrders.orderId]
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