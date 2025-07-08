import Head from 'next/head';

export default function PWAHead() {
  return (
    <Head>
      {/* PWA Meta Tags */}
      <meta name="application-name" content="Mythoria" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="Mythoria" />
      <meta name="format-detection" content="telephone=no" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="msapplication-config" content="/browserconfig.xml" />
      <meta name="msapplication-TileColor" content="#014A70" />
      <meta name="msapplication-tap-highlight" content="no" />
      
      {/* Apple Touch Icons */}
      <link rel="apple-touch-icon" href="/icon-192.png" />
      <link rel="apple-touch-icon" sizes="152x152" href="/icon-192.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/icon-192.png" />
      <link rel="apple-touch-icon" sizes="167x167" href="/icon-192.png" />
      
      {/* Icon Links */}
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon.ico" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon.ico" />
      <link rel="manifest" href="/manifest.json" />
      <link rel="mask-icon" href="/icon-192.png" color="#014A70" />
      <link rel="shortcut icon" href="/favicon.ico" />
      
      {/* Splash Screens for iOS */}
      <link rel="apple-touch-startup-image" href="/icon-512.png" />
    </Head>
  );
}
