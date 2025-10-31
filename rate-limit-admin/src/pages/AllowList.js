// src/pages/AllowList.js
import { useEffect } from 'react';
import AllowlistEditor from '../components/AllowlistEditor';

function AllowList() {
    useEffect(() => {
        // Initialize allow list page
        document.title = 'Allow List - Rate Limit Admin';
    }, []);

    return (
        <div className="page allow-list">
            <h1>Allow List Configuration</h1>
            <AllowlistEditor />
        </div>
    );
}

export default AllowList;
