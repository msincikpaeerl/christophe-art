/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** Set by the middleware on every /admin request that the guard let through. */
    admin: {
      /** The signed-in account and session; undefined on the login page for a visitor. */
      active: import('./server/admin/sessions.ts').ActiveSession | undefined;
      ip: string;
      settings: import('./server/admin/settings.ts').AdminSettings;
    };
  }
}
