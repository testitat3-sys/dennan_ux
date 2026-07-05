import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="*" element={
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '1.5rem',
            fontWeight: '500',
            color: '#374151'
          }}>
            Admin portal coming soon
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;
