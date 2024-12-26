require('dotenv').config();
const axios = require('axios');
const querystring = require('querystring');
const db = require('./app/models');
const clientInfoDB = db.clientDetails;

// Google OAuth 2.0 Endpoints
const GOOGLE_OAUTH2_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

// Load environment variables
const REDIRECT_URI = process.env.REDIRECT_URI;

// State to track tokens and expiry
const tokenState = {
    tokens: null,
    tokenExpiryTime: null,
};

/**
 * Generate Google OAuth 2.0 Authorization URL
 * @param {Object} clientDetails - Client details containing Google credentials
 * @returns {string} Authorization URL
 */
function getAuthorizationUrl(clientDetails) {
    const params = {
        client_id: clientDetails.clientGoogleID,
        redirect_uri: REDIRECT_URI,
        response_type: 'code',
        scope: 'https://mail.google.com/',
        access_type: 'offline',
        prompt: 'consent',
    };

    return `${GOOGLE_OAUTH2_URL}?${querystring.stringify(params)}`;
}

/**
 * Fetch tokens using authorization code
 * @param {string} authCode - Authorization code from user consent
 * @param {Object} clientDetails - Client details containing Google credentials
 * @returns {Promise<Object>} Tokens and expiry information
 */
async function getTokens(clientDetails) {
    try {
        const response = await axios.post(
            GOOGLE_TOKEN_URL,
            querystring.stringify({
                code: clientDetails.clientAuthorizationCode,
                client_id: clientDetails.clientGoogleID,
                client_secret: clientDetails.clientGoogleSecret,
                redirect_uri: REDIRECT_URI,
                grant_type: 'authorization_code',
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const { access_token, refresh_token, expires_in } = response.data;
        const newTokenExpiryTimestamp = Date.now() + expires_in * 1000;

        // Update tokens in the database
        await clientInfoDB.update(
            {
                clientAuthToken: access_token,
                clientRefToken: refresh_token,
                clientTokenExp: expires_in,
                tokenExpiryTimestamp: newTokenExpiryTimestamp,
            },
            { where: { id: clientDetails.id } }
        );

        console.log('Tokens fetched and saved.');

        // Update token state
        tokenState.tokens = { access_token, refresh_token };
        tokenState.tokenExpiryTime = newTokenExpiryTimestamp;

        return { access_token, refresh_token, expires_in };
    } catch (error) {
        handleError('Error fetching tokens', error);
        throw error;
    }
}

/**
 * Refresh access token using the refresh token
 * @param {Object} clientDetails - Client details containing Google credentials
 * @returns {Promise<Object>} New access token and expiry
 */
async function refreshAccessToken(clientDetails) {
    try {
        const response = await axios.post(
            GOOGLE_TOKEN_URL,
            querystring.stringify({
                client_id: clientDetails.clientGoogleID,
                client_secret: clientDetails.clientGoogleSecret,
                refresh_token: clientDetails.clientRefToken,
                grant_type: 'refresh_token',
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const { access_token, expires_in } = response.data;
        const tokenExpiryTimestamp = Date.now() + expires_in * 1000;

        // Update tokens in the database
        await clientInfoDB.update(
            {
                clientAuthToken: access_token,
                clientTokenExp: expires_in,
                tokenExpiryTimestamp: tokenExpiryTimestamp,
            },
            { where: { id: clientDetails.id } }
        );

        console.log('Access token refreshed and saved.');

        // Update token state
        tokenState.tokens.access_token = access_token;
        tokenState.tokenExpiryTime = tokenExpiryTimestamp;

        return { access_token, expires_in };
    } catch (error) {
        handleError('Error refreshing access token', error);
        throw error;
    }
}

/**
 * Schedule token refresh based on expiry time
 * @param {Object} clientDetails - Client details containing Google credentials
 */
function scheduleTokenRefresh(clientDetails) {
    const timeUntilExpiry = tokenState.tokenExpiryTime - Date.now();
    const refreshBufferTime = Math.max(timeUntilExpiry - 30000, 0); // 30 seconds before expiry

    console.log(`Scheduling token refresh in ${refreshBufferTime / 1000} seconds...`);

    setTimeout(async () => {
        try {
            console.log('Refreshing access token...');
            await refreshAccessToken(clientDetails);
            scheduleTokenRefresh(clientDetails); // Reschedule after successful refresh
        } catch (error) {
            console.error('Failed to refresh access token:', error.message);
        }
    }, refreshBufferTime);
}

/**
 * Main function: Handle OAuth flow
 * @param {Object} clientDetails - Client details containing Google credentials
 */
async function getAuthorizedToken(clientDetails) {
    try {
        // Check if tokens are already present in the database
        const { clientAuthToken, clientRefToken, clientTokenExp, tokenExpiryTimestamp } = clientDetails;
        const currentTime = Date.now();

        if (currentTime < tokenExpiryTimestamp - 30000) {
            // Use existing tokens and schedule refresh
            console.log('Using existing tokens...');
            tokenState.tokens = {
                access_token: clientAuthToken,
                refresh_token: clientRefToken,
            };
            tokenState.tokenExpiryTime = tokenExpiryTimestamp;
            scheduleTokenRefresh(clientDetails);
        } else {
            // Fetch tokens for the first time
            console.log('Fetching tokens for the first time...');
            await getTokens(clientDetails);
            scheduleTokenRefresh(clientDetails);
        }
    } catch (error) {
        console.error('Error during OAuth flow:', error.message);
    }
}

/**
 * Handle errors and log details
 * @param {string} message - Error context message
 * @param {Error} error - Error object
 */
function handleError(message, error) {
    console.error(message);
    if (error.response) {
        console.error('Response Data:', error.response.data);
        console.error('Status Code:', error.response.status);
    } else {
        console.error('Error Message:', error.message);
    }
}

module.exports = getAuthorizedToken;
