// src/pages/RateLimits.js
import { useEffect } from 'react';
import LimitsEditor from '../components/LimitsEditor';

function RateLimits() {
    useEffect(() => {
        // Initialize rate limits page
        document.title = 'Rate Limits - Rate Limit Admin';
    }, []);

    return (
        <div className="page rate-limits">
            <h1>Rate Limits Configuration</h1>
            <LimitsEditor />
        </div>
    );
}

export default RateLimits;
