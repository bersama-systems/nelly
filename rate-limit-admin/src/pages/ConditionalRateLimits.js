// src/pages/ConditionalRateLimits.js
import { useEffect } from 'react';
import ConditionalLimitsEditor from '../components/ConditionalLimitsEditor';

function ConditionalRateLimits() {
    useEffect(() => {
        // Initialize conditional rate limits page
        document.title = 'Conditional Rate Limits - Rate Limit Admin';
    }, []);

    return (
        <div className="page conditional-rate-limits">
            <h1>Conditional Rate Limits Configuration</h1>
            <ConditionalLimitsEditor />
        </div>
    );
}

export default ConditionalRateLimits;
