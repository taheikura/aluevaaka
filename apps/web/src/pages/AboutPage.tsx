export function AboutPage() {
  return (
    <div className="about-page">
      <h1>Tietoa Aluevaakasta</h1>

      <section>
        <h2>Mikä tämä on?</h2>
        <p>
          Aluevaaka auttaa vertailemaan pääkaupunkiseudun asuinalueita eri elämäntilanteisiin. Se
          yhdistää avoimia tilastoaineistoja käyttäjän valitsemiin painotuksiin ja palauttaa
          selitettyjä suosituksia.
        </p>
      </section>

      <section>
        <h2>Miten pisteytys toimii?</h2>
        <p>
          Jokainen H3-ruutu pisteytetään valitsemillasi painotuksilla. Parempi arvo suhteessa muihin
          ruutuihin tuottaa korkeamman kategoriapisteen. Lopullinen pistemäärä on painotettu
          keskiarvo kategoriapisteistä. Pakolliset ehdot poistavat alueen tuloksista kokonaan ennen
          pisteytystä.
        </p>
        <p>
          Pisteet kuvaavat alueen sijoittumista{' '}
          <em>muihin alueisiin verrattuna sinun painotuksillasi</em> – ne eivät ole absoluuttisia
          mittoja.
        </p>
      </section>

      <section>
        <h2>Aineistolähteet</h2>
        <p>
          Palvelu käyttää seuraavia avoimia aineistoja. Tiedot käsitellään etukäteen ja yhdistetään
          noin 200 metrin H3-ruutuihin. Lähdeaineistojen päivitykset eivät ole reaaliaikaisia.
        </p>
        <ul className="data-source-list">
          <li>
            <a href="https://www.hsy.fi/avoindata/" target="_blank" rel="noreferrer">
              HSY:n avoin data
            </a>{' '}
            – pääkaupunkiseudun postinumeroalueet (alueiden rajat ja nimet).
          </li>
          <li>
            <a
              href="https://pxweb2.stat.fi/PxWeb/pxweb/fi/StatFin/StatFin__ashi/"
              target="_blank"
              rel="noreferrer"
            >
              Tilastokeskus, asuntojen kauppahinnat postinumeroalueittain
            </a>{' '}
            – toteutuneet hinnat ja kauppojen lukumäärät. Käyttöehto: CC BY 4.0.
          </li>
          <li>
            <a
              href="https://download.geofabrik.de/europe/finland.html"
              target="_blank"
              rel="noreferrer"
            >
              OpenStreetMap / Geofabrik Finland
            </a>{' '}
            – palvelu-, liikenne- ja virkistyskohteet. Tiedot ovat OpenStreetMapin ODbL-lisenssin
            alaisia.
          </li>
          <li>
            <a
              href="https://kartta.hel.fi/ws/geoserver/avoindata/wfs"
              target="_blank"
              rel="noreferrer"
            >
              Helsingin kaupungin meluselvitys 2022
            </a>{' '}
            – tieliikenteen mallinnettu päivä-ilta-yömelu (Lden), CC BY 4.0.
          </li>
        </ul>
        <p>
          Tietojen kattavuus vaihtelee alueittain. Puuttuvat tiedot eivät laske pisteitä – ne
          näkyvät kattavuusprosenttina tuloskorteissa. Poikkeuksena liikennemelussa mallinnetun
          tieosuuden ulkopuolinen ruutu tulkitaan vähäisen tie- ja katuliikennemelun alueeksi. Tämä
          on oletus vain tälle mittarille, eikä sitä sovelleta muihin puuttuviin tietoihin.
          Aineistoversion päivämäärä ja tarkemmat lähdetiedot löytyvät myös julkaistun aineiston
          manifestista.
        </p>
      </section>

      <section>
        <h2>Rajoitukset</h2>
        <ul>
          <li>Tulokset eivät korvaa ammattimaista kiinteistö- tai muuttopalvelua.</li>
          <li>Aineistot päivitetään säännöllisesti mutta eivät reaaliajassa.</li>
          <li>Palvelu ei tallenna käyttäjätietoja.</li>
        </ul>
      </section>
    </div>
  );
}
