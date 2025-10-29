// src/App.js
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import RateLimits from './pages/RateLimits';
import AllowList from './pages/AllowList';
import NetworkAccess from './pages/NetworkAccess';
import ConditionalRateLimits from './pages/ConditionalRateLimits';
import './App.css';

function App() {
  return (
      <Router>
        <div className="app">
          <Navigation />
          <main className="content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/rate-limits" element={<RateLimits />} />
              <Route path="/allow-list" element={<AllowList />} />
              <Route path="/network-access" element={<NetworkAccess />} />
              <Route path="/conditional-rate-limits" element={<ConditionalRateLimits />} />
            </Routes>
          </main>
        </div>
      </Router>
  );
}

export default App;