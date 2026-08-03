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
          Palvelu käyttää suomalaisia avoimia aineistoja, kuten Tilastokeskuksen ja muiden
          viranomaisten julkaisemia tilastoja. Jokainen tulos sisältää tiedon aineistoversion
          päivämäärästä. Täydelliset lähdetiedot löytyvät aineistomanifestista.
        </p>
        <p>
          Tietojen kattavuus vaihtelee alueittain. Puuttuvat tiedot eivät laske pisteitä – ne
          näkyvät kattavuusprosenttina tuloskorteissa.
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
