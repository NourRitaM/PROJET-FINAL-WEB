import { getCountries, getCountryCallingCode, parsePhoneNumberFromString } from 'libphonenumber-js';

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });
const countries = getCountries()
  .map((country) => ({
    code: country,
    name: countryNames.of(country) ?? country,
    callingCode: getCountryCallingCode(country),
  }))
  .sort((left, right) => left.name.localeCompare(right.name));

export function PhoneNumberField({ value, name = 'phone', label = 'Phone number' }) {
  const parsed = value ? parsePhoneNumberFromString(value) : undefined;
  const selectedCountry = parsed?.country ?? 'LB';

  return (
    <>
      <label>
        Country/region
        <select name={`${name}Country`} defaultValue={selectedCountry}>
          {countries.map(({ code, name: countryName, callingCode }) => (
            <option key={code} value={code}>
              {countryName} (+{callingCode})
            </option>
          ))}
        </select>
      </label>
      <label>
        {label}
        <input
          name={`${name}National`}
          type="tel"
          defaultValue={parsed?.formatNational() ?? ''}
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="Enter your number"
        />
      </label>
    </>
  );
}
