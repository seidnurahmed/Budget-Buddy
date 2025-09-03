-- In a real project, you would run these SQL commands
-- to set up your database tables.

-- Create a users table
DROP TABLE IF EXISTS plaid_items;
DROP TABLE IF EXISTS users;
CREATE TABLE users (
id SERIAL PRIMARY KEY,
username VARCHAR(255) NOT NULL UNIQUE,
password_hash VARCHAR(255) NOT NULL
);

-- Create a table to store Plaid access tokens
-- Each user can have multiple linked bank accounts
CREATE TABLE plaid_items (
id SERIAL PRIMARY KEY,
user_id INT NOT NULL,
item_id VARCHAR(255) NOT NULL UNIQUE,
access_token TEXT NOT NULL,
CONSTRAINT fk_user_id
FOREIGN KEY(user_id)
REFERENCES users(id)
ON DELETE CASCADE
);