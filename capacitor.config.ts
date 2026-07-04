import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId:   'com.galaxynutrition.app',
  appName: 'Galaxy Nutrition',
  webDir:  'capacitor-web',   // placeholder — the app loads the live site below

  // The iOS app is a native shell that loads the production site.
  // Deploys to Vercel update the app instantly — no App Store re-submission needed.
  server: {
    url: 'https://galaxy-nutrition.vercel.app',
    allowNavigation: [
      'galaxy-nutrition.vercel.app',
      '*.supabase.co',
      'checkout.stripe.com',
      'billing.stripe.com',
    ],
  },

  ios: {
    contentInset:            'automatic',
    backgroundColor:         '#0a0014',
    preferredContentMode:    'mobile',
    scrollEnabled:           true,
    allowsLinkPreview:       false,
  },
}

export default config
