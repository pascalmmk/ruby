import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Configures the root HTML for the web (static) build: page title, description,
 * theme color, add-to-home-screen support, and link-preview (Open Graph) tags.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        <title>Ruby — shared lists</title>
        <meta
          name="description"
          content="Real-time shared shopping & to-do lists. Make a list, share it with friends, and every change syncs live."
        />
        <meta name="theme-color" content="#C0182F" />

        {/* Add-to-home-screen */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Ruby" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Link preview when the URL is shared */}
        <meta property="og:title" content="Ruby" />
        <meta
          property="og:description"
          content="Real-time shared lists, synced live across everyone's devices."
        />
        <meta property="og:type" content="website" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
