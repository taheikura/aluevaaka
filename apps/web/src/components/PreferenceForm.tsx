import type { Preferences, RecommendationRequest } from '@aluevaaka/schemas';
import { type FormEvent, useState } from 'react';

interface Props {
  value?: {
    preferences: Preferences;
    maxHousingCost: string;
    maxHealthcareKm: string;
  };
  onChange?: (request: RecommendationRequest) => void;
  onSubmit?: (request: RecommendationRequest) => void;
  isLoading: boolean;
  showConstraints?: boolean;
}

const CATEGORIES: { key: keyof Preferences; label: string; description: string }[] = [
  {
    key: 'housingAffordability',
    label: 'Asumisen hinta',
    description: 'Vuokra- ja ostotaso suhteessa muihin pääkaupunkiseudun alueisiin',
  },
  {
    key: 'transportConnectivity',
    label: 'Liikenne ja yhteydet',
    description: 'Julkinen liikenne, raideyhteydet ja laajakaista',
  },
  {
    key: 'natureProximity',
    label: 'Lähellä luontoa',
    description: 'Etäisyys lähimpään puistoon tai luonnonsuojelualueeseen',
  },
  {
    key: 'economicOutlook',
    label: 'Talousnäkymät',
    description: 'Työllisyys, muuttovoitto ja mediaanitulot',
  },
  {
    key: 'trafficNoise',
    label: 'Liikennemelu',
    description: 'Mallinnettu tieliikenteen päivä-ilta-yömelutaso; pienempi on parempi',
  },
  {
    key: 'healthcareProximity',
    label: 'Lähellä terveyspalveluita',
    description: 'Etäisyys lähimpään terveyspalveluun',
  },
  {
    key: 'groceryProximity',
    label: 'Lähellä ruokakauppoja',
    description: 'Etäisyys lähimpään ruokakauppaan',
  },
  {
    key: 'schoolProximity',
    label: 'Lähellä kouluja',
    description: 'Etäisyys lähimpään kouluun',
  },
];

const DEFAULT_PREFERENCES: Preferences = {
  housingAffordability: 0,
  healthcareAccess: 0,
  transportConnectivity: 0,
  natureAndRecreation: 0,
  economicOutlook: 0,
  trafficNoise: 0,
  services: 0,
  healthcareProximity: 0,
  groceryProximity: 0,
  schoolProximity: 0,
  natureProximity: 0,
};

export function PreferenceForm({
  value,
  onChange,
  onSubmit,
  isLoading,
  showConstraints = true,
}: Props) {
  const [localPreferences, setLocalPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [localMaxHousingCost, setLocalMaxHousingCost] = useState('');
  const [localMaxHealthcareKm, setLocalMaxHealthcareKm] = useState('');
  const preferences = value?.preferences ?? localPreferences;
  const maxHousingCost = value?.maxHousingCost ?? localMaxHousingCost;
  const maxHealthcareKm = value?.maxHealthcareKm ?? localMaxHealthcareKm;

  function handleSlider(key: keyof Preferences, value: number) {
    const next = { ...preferences, [key]: value / 100 };
    if (onChange) {
      onChange({ preferences: next, constraints: {}, limit: 10 });
    } else {
      setLocalPreferences(next);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const request: RecommendationRequest = {
      preferences,
      constraints: {
        ...(maxHousingCost ? { maximumHousingCostEur: Number(maxHousingCost) } : {}),
        ...(maxHealthcareKm ? { maximumDistanceToHealthcareKm: Number(maxHealthcareKm) } : {}),
      },
      limit: 10,
    };
    (onChange ?? onSubmit)?.(request);
  }

  const anyWeightSet = Object.values(preferences).some((v) => (v ?? 0) > 0);

  return (
    <form onSubmit={handleSubmit} className="preference-form" noValidate>
      <fieldset>
        <legend>Mitä arvostat asuinpaikassasi?</legend>
        <p className="form-hint">
          Siirrä liukusäädin nollasta sadaan sen mukaan, kuinka tärkeä asia on sinulle. Painotukset
          normalisoidaan automaattisesti.
        </p>

        {CATEGORIES.map(({ key, label, description }) => (
          <div key={key} className="preference-row">
            <label htmlFor={`pref-${key}`}>
              <span className="pref-label">{label}</span>
              <span className="pref-desc">{description}</span>
            </label>
            <div className="slider-wrapper">
              <input
                id={`pref-${key}`}
                type="range"
                min={0}
                max={100}
                step={5}
                value={Math.round((preferences[key] ?? 0) * 100)}
                onChange={(e) => handleSlider(key, Number(e.target.value))}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round((preferences[key] ?? 0) * 100)}
              />
              <output htmlFor={`pref-${key}`} className="slider-value">
                {Math.round((preferences[key] ?? 0) * 100)}
              </output>
            </div>
          </div>
        ))}
      </fieldset>

      {showConstraints && (
        <fieldset>
          <legend>Pakolliset ehdot (valinnainen)</legend>
          <p className="form-hint">
            Alueet, jotka eivät täytä ehtoja, poistetaan tuloksista kokonaan. Ilman ehtoja näet
            parhaat saatavilla olevat vaihtoehdot.
          </p>

          <div className="constraint-row">
            <label htmlFor="max-rent">Enimmäisvuokra (€/kk)</label>
            <input
              id="max-rent"
              type="number"
              min={300}
              max={5000}
              step={50}
              placeholder="esim. 900"
              value={maxHousingCost}
              onChange={(e) => {
                if (onChange)
                  onChange({
                    preferences,
                    constraints: { maximumHousingCostEur: Number(e.target.value) },
                    limit: 10,
                  });
                else setLocalMaxHousingCost(e.target.value);
              }}
            />
          </div>

          <div className="constraint-row">
            <label htmlFor="max-healthcare">Enimmäisetäisyys terveyskeskukseen (km)</label>
            <input
              id="max-healthcare"
              type="number"
              min={1}
              max={200}
              step={5}
              placeholder="esim. 30"
              value={maxHealthcareKm}
              onChange={(e) => {
                if (onChange)
                  onChange({
                    preferences,
                    constraints: { maximumDistanceToHealthcareKm: Number(e.target.value) },
                    limit: 10,
                  });
                else setLocalMaxHealthcareKm(e.target.value);
              }}
            />
          </div>
        </fieldset>
      )}

      <button
        type="submit"
        disabled={!anyWeightSet || isLoading}
        aria-busy={isLoading}
        className="submit-button"
      >
        {isLoading ? 'Päivitetään…' : 'Etsi sopivat alueet'}
      </button>

      {!anyWeightSet && (
        <p role="alert" className="form-error">
          Aseta vähintään yksi painotus ennen hakua.
        </p>
      )}
    </form>
  );
}
