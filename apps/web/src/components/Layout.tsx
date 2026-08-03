import { NavLink, Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="layout">
      <header className="header">
        <a href="/" className="logo" aria-label="Aluevaaka etusivu">
          <strong>Aluevaaka</strong>
        </a>
        <nav aria-label="Päänavigaatio">
          <ul className="nav-list">
            <li>
              <NavLink to="/" end>
                Etusivu
              </NavLink>
            </li>
            <li>
              <NavLink to="/about">Tietoa palvelusta</NavLink>
            </li>
          </ul>
        </nav>
      </header>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
