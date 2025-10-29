// src/pages/NetworkAccess.js
import { useEffect } from 'react';
import NetworkAccessEditor from '../components/NetworkAccessEditor';

function NetworkAccess() {
    useEffect(() => {
        // Initialize network access page
        document.title = 'Account-Network Access - Rate Limit Admin';
    }, []);

    return (
        <div className="page network-access" style={{ marginTop: 16 }}>
            <h1>Account-Network Access Configuration</h1>
            <NetworkAccessEditor />
        </div>
    );
}

export default NetworkAccess;
