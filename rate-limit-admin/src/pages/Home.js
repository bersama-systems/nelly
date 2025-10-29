// src/pages/Home.js
import { useEffect } from 'react';
import Sparkles from '../components/Sparkles';

function Home() {
    useEffect(() => {
        // Initialize home page
        document.title = 'Home - Rate Limit Admin';
    }, []);

    return (
        <div className="page home" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', position: 'relative', zIndex: 1 }}>
            <Sparkles />
            <h1 style={{ textAlign: 'center' }}>Welcome to Nelly</h1>
            <img src="/horse.png" alt="Horse" style={{ maxWidth: '400px', width: '100%' }} />
        </div>
    );
}

export default Home;
