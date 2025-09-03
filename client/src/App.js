import React, { useState, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import './App.css';

function App() {
  const [linkToken, setLinkToken] = useState(null);
  const [transactions, setTransactions] = useState([]);

  // Fetch a link token from your backend
  useEffect(() => {
    const fetchLinkToken = async () => {
      try {
        const response = await fetch('/api/create_link_token', {
          method: 'POST',
        });
        const data = await response.json();
        setLinkToken(data.link_token);
      } catch (error) {
        console.error('Error fetching link token:', error);
      }
    };
    fetchLinkToken();
  }, []);

  // Plaid Link hook
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (public_token, metadata) => {
      // Exchange the public token for a permanent access token
      try {
        const response = await fetch('/api/exchange_public_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ public_token }),
        });
        const data = await response.json();
        if (data.success) {
          console.log('Public token exchanged successfully!');
        }
      } catch (error) {
        console.error('Error exchanging public token:', error);
      }
    },
  });

  // Fetch transactions from your backend
  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/transactions');
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Budget Buddy</h1>
        {/* Button to launch Plaid Link */}
        <button onClick={() => open()} disabled={!ready}>
          Link Your Bank Account
        </button>

        {/* Button to fetch and display transactions */}
        <button onClick={fetchTransactions} disabled={transactions.length > 0}>
          Fetch Transactions
        </button>

        <h2>Transactions</h2>
        {transactions.length > 0 ? (
          <ul>
            {transactions.map((transaction, index) => (
              <li key={index}>
                {transaction.date} - {transaction.name}: ${transaction.amount}
              </li>
            ))}
          </ul>
        ) : (
          <p>No transactions to display. Link an account and fetch transactions.</p>
        )}
      </header>
    </div>
  );
}

export default App;
