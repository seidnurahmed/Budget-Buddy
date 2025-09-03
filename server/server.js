const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const plaid = require('plaid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Plaid API configuration
const configuration = new plaid.Configuration({
    basePath: plaid.PlaidEnvironments[process.env.PLAID_ENV],
    baseOptions: {
        headers: {
            'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
            'PLAID-SECRET': process.env.PLAID_SECRET,
        },
    },
});
const client = new plaid.PlaidApi(configuration);

// PostgreSQL database configuration
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

pool.connect((err, client, done) => {
    if (err) {
        console.error('Database connection failed', err.stack);
        return;
    }
    console.log('Successfully connected to the PostgreSQL database.');
    done();
});

// A dummy user ID for a single-user app
const DUMMY_USER_ID = 1;

// Helper function to create a dummy user if they don't exist
const createDummyUser = async () => {
    try {
        await pool.query('INSERT INTO users (id, username, password_hash) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING;', [DUMMY_USER_ID, 'dummy_user', 'placeholder_hash']);
    } catch (error) {
        console.error('Error creating dummy user:', error.message);
    }
};
createDummyUser();

// Endpoint to create a Plaid Link token
app.post('/api/create_link_token', async (req, res) => {
    try {
        const response = await client.linkTokenCreate({
            user: {
                client_user_id: DUMMY_USER_ID.toString(),
            },
            client_name: 'Budget Buddy',
            products: [plaid.Products.Transactions],
            country_codes: [plaid.CountryCode.Us],
            language: 'en',
        });
        res.json({ link_token: response.data.link_token });
    } catch (error) {
        console.error('Error creating link token:', error.response ? error.response.data : error);
        res.status(500).send('Failed to create link token.');
    }
});

// Endpoint to exchange a Plaid public token for a permanent access token
app.post('/api/exchange_public_token', async (req, res) => {
    try {
        const { public_token } = req.body;
        const response = await client.itemPublicTokenExchange({ public_token });
        const { access_token, item_id } = response.data;
        
        console.log('Successfully exchanged public token.');
        console.log('Access Token:', access_token);
        console.log('Item ID:', item_id);

        // Save the access_token and item_id to the database
        const queryText = `
            INSERT INTO plaid_items (user_id, item_id, access_token)
            VALUES ($1, $2, $3)
            ON CONFLICT (item_id) DO UPDATE SET access_token = EXCLUDED.access_token;
        `;
        await pool.query(queryText, [DUMMY_USER_ID, item_id, access_token]);

        res.json({ success: true });
    } catch (error) {
        console.error('Error exchanging public token:', error.response ? error.response.data : error);
        res.status(500).send('Failed to exchange public token.');
    }
});

// Endpoint to fetch transactions
app.get('/api/transactions', async (req, res) => {
    try {
        // Retrieve the latest access_token from the database
        const result = await pool.query('SELECT access_token FROM plaid_items ORDER BY id DESC LIMIT 1');
        if (result.rows.length === 0) {
            return res.status(404).send('No linked accounts found.');
        }
        const accessToken = result.rows[0].access_token;

        const startDate = '2023-01-01';
        const endDate = new Date().toISOString().slice(0, 10);
        const response = await client.transactionsGet({
            access_token: accessToken,
            start_date: startDate,
            end_date: endDate,
        });

        res.json(response.data.transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error.response ? error.response.data : error);
        res.status(500).send('Failed to fetch transactions.');
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
