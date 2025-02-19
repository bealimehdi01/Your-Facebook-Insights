# Your Facebook Insights

A Facebook Page Insights viewer built with the MERN stack.

## Features
- Facebook Login OAuth
- Page Insights Display with Data Source Indication
- Date Range Selection
- Automatic Fallback to Basic Stats

## Live Demo
[Visit the live application](https://your-facebook-insights.vercel.app)

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Generate local SSL certificates (for development):
```bash
mkdir certs
cd certs
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes
```

3. Environment Variables:
Create `.env` file with:
```
MONGO_URI=your_mongodb_uri
FB_APP_ID=your_facebook_app_id
FB_APP_SECRET=your_facebook_app_secret
FB_REDIRECT_URI=your_redirect_uri
```

4. Run Development Server:
```bash
npm run dev
```

5. Run Production Server:
```bash
npm start
```

## Deployment
The app is ready to deploy on Vercel/Netlify.

## Testing Access
Developer username "MetaAPIExpert" has been added for testing purposes.
