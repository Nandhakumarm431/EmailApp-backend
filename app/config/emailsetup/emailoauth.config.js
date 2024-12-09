// // Create XOAUTH2 generator with correct credentials
// const xoauth2gen = xoauth2.createXOAuth2Generator({
//     user: process.env.AUTH_EMAIL,
//     clientId: process.env.AUTH_CLIENTID, // From Google Developer Console
//     clientSecret: process.env.AUTH_CLIENT_SECRET, // From Google Developer Console
//     refreshToken: process.env.AUTH_REF_TOKEN, // The one you obtain from Google OAuth Playground or OAuth2 flow
//     accessToken: process.env.AUTH_ACCESS_TOKEN, // Optional, will be generated if refreshToken is provided
//     expires: 3600000000
// });

// module.exports = xoauth2gen;

require('dotenv').config();
const xoauth2 = require('xoauth2');
const getClientInfoFromMailID = require('../../services/sendClientInfo');

// Create XOAUTH2 generator with correct credentials
async function createAuthTokens(clientEmailID) {
    try {
        const clientInfo = await getClientInfoFromMailID(clientEmailID);

        if (!clientInfo) {
            throw new Error('Client information not found!');
        }
        const xoauth2gen = xoauth2.createXOAuth2Generator({
            user: clientInfo.clientEmailID,
            clientId: clientInfo.clientGoogleID, // From Google Developer Console
            clientSecret: clientInfo.clientGoogleSecret, // From Google Developer Console
            refreshToken: clientInfo.clientRefToken, // From OAuth Playground or OAuth2 flow
            accessToken: clientInfo.clientAuthToken, // Optional
            expires: 3600000000, // Token expiration time
        });
        return xoauth2gen; // Return the generator instance
    } catch (error) {
        console.error('Error creating XOAUTH2 generator:', error.message);
        throw error; // Re-throw the error for the caller to handle
    }
}

module.exports = createAuthTokens;