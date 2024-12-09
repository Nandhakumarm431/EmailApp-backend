// const { google } = require('googleapis');
// const OAuth2 = google.auth.OAuth2;

// const fetchGoogleTokens = async (clientId, clientSecret, redirectUri, authCode) => {
//     const oauth2Client = new OAuth2(clientId, clientSecret, redirectUri);

//     try {
//         console.log('Exchanging auth code for tokens...');
//         console.log('Auth Code:', authCode);
//         console.log('Redirect URI:', redirectUri);

//         // Exchange authorization code for tokens
//         const { tokens } = await oauth2Client.getToken(authCode);
//         console.log('Tokens:', tokens); // Log tokens
//         return tokens;
//     } catch (error) {
//         console.error('Error fetching tokens:', error.message);
//         console.error('Full error:', error.response?.data); // Log detailed error
//         throw new Error('Failed to exchange authorization code for tokens');
//     }
// };

// const generateAuthUrlAndFetchTokens = async () => {
//     const clientId = '2843948648-lr1jplblpcc6vasf1g7olt4j7lrfb792.apps.googleusercontent.com';
//     const clientSecret = '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';
//     const redirectUri = 'https://developers.google.com/oauthplayground';
//     const scopes = [
//         'https://mail.google.com/', // Full access to the user's Gmail
//         'https://www.googleapis.com/auth/gmail.readonly', // Read-only Gmail access
//         'https://www.googleapis.com/auth/gmail.compose', // Compose emails
//         'https://www.googleapis.com/auth/gmail.send', // Send emails
//         'https://www.googleapis.com/auth/gmail.labels', // Manage labels
//     ];

//     const oauth2Client = new OAuth2(clientId, clientSecret, redirectUri);

//     // Generate the URL for user consent
//     const authUrl = oauth2Client.generateAuthUrl({
//         access_type: 'offline', // Request refresh tokens
//         scope: scopes, // Specify the scopes
//     });

//     console.log('Authorize this app by visiting this URL:', authUrl);

//     // Replace 'your_auth_code' with the auth code from the above URL
//     const authCode = '4/0AeanS0bYv91jJXGT4l5cGEqJkChz6YSexuqvKGzVFTq3BnzfNYhzEpnjzRj42uAxZUNHkA'; // Paste the new code after generating it
//     try {
//         const tokens = await fetchGoogleTokens(clientId, clientSecret, redirectUri, authCode);
//         console.log('Access Token:', tokens.access_token);
//         console.log('Refresh Token:', tokens.refresh_token);
//     } catch (error) {
//         console.error(error.message);
//     }
// };

// generateAuthUrlAndFetchTokens();

