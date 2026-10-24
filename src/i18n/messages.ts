// Types of the dictionaries: a missing or extra key in any language is a type error.

import type { en } from './dictionaries/en.ts';

type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

/** The shape every language dictionary must have. */
export type Messages = Shape<typeof en>;

/** A key of the dictionary, such as `nav.gallery`. */
export type MessageKey = Paths<typeof en>;
