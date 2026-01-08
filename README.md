# Xamu nuxt firebase module

Powered by Nuxt.js

## Prerequisites

A firebase service account would be required. You could find a sample on the discord server

See [Enviroment variables](#environment-variables)

## Setup

Make sure to install the dependencies:

```bash
yarn install
```

## Development

Start the development server on http://localhost:3000

```bash
yarn dev
```

When updating dependencies, make sure to check the lock file. Your dependencies could resolve to different versions than expected.

## Production

Build the application for production:

```bash
yarn build
```

## Extras

Due to an [issue with volar](https://github.com/vuejs/language-tools/issues/5018#issuecomment-2495098549), typescript version is fixed at @5.6.3

Firebase requires 2 keys, the private one from recaptcha, and the site key from recaptcha enterprise. The former one is passed from the config file.

For app check create the key from Recaptcha v3 console instead of enterprise to avoid issues with legacy keys validation. The debug token allows bypassing the validation on dev environments

### Enviroment variables

```
# Firebase, public
F_API_KEY=
F_AUTH_DOMAIN="FIREBASE-PROJECT-ID.firebaseapp.com"
F_PROJECT_ID="FIREBASE-PROJECT-ID"
F_STORAGE_BUCKET="FIREBASE-PROJECT-ID.firebasestorage.app"
F_MESSAGING_SENDER_ID=
F_APP_ID=
F_MEASUREMENT_ID=
# Service account, private
F_PRIVATE_KEY=""
F_CLIENT_EMAIL=""
# App check, site key, public
RECAPTCHA_ENTERPRISE_SITE_KEY=

# Google fonts
FONTS_API_KEY=

# Project
ORIGIN=
COUNTRIES_API=
# Allow search engines to index the site
INDEXABLE=false
# Match instance locally
INSTANCE=""
# App name, this will override the site name on the head
APP_NAME=""

# Debugging
DEBUG_APP_CHECK=false
DEBUG_FIREBASE=false
# Compile css on runtime
DEBUG_CSS=false
# Enable nuxt devtools
DEBUG_NUXT=false
# Disable server cache
DEBUG_NITRO=false
```
