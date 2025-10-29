// src/pages/NetworkAccess.js
import { useEffect } from 'react';

function NetworkAccess() {
    useEffect(() => {
        // Initialize network access page
        document.title = 'Network Access - Rate Limit Admin';
    }, []);

    return (
        <div className="page network-access">
            <h1>Network Access Configuration</h1>
        </div>
    );
}

export default NetworkAccess;