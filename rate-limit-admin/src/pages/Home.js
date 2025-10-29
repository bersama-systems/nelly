// src/pages/Home.js
import { useEffect } from 'react';

function Home() {
    useEffect(() => {
        // Initialize home page
        document.title = 'Home - Rate Limit Admin';
    }, []);

    return (
        <div className="page home">
            <h1>Welcome to Rate Limit Administration</h1>
            <p>Select a menu item to manage your rate limiting configuration.</p>
        </div>
    );
}

export default Home;