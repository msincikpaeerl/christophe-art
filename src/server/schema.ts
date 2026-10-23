import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/** Free-form key/value pairs about the installation. Real tables arrive with the features. */
export const appMeta = pgTable('app_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
