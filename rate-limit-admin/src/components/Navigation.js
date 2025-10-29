// src/components/Navigation.js
import { NavLink } from 'react-router-dom';

function Navigation() {
    return (
        <nav className="navigation">
            <ul>
                <li>
                    <NavLink to="/" end>Home</NavLink>
                </li>
                <li>
                    <NavLink to="/rate-limits">Rate Limits</NavLink>
                </li>
                <li>
                    <NavLink to="/allow-list">Allow List</NavLink>
                </li>
                <li>
                    <NavLink to="/network-access">Network Access</NavLink>
                </li>
                <li>
                    <NavLink to="/conditional-rate-limits">Conditional Rate Limits</NavLink>
                </li>
            </ul>
        </nav>
    );
}

export default Navigation;