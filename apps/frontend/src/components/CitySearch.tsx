import { type FormEvent, useState } from "react";

type CitySearchProps = {
  isLoading: boolean;
  onSearch: (city: string) => void;
};

export function CitySearch({ isLoading, onSearch }: CitySearchProps) {
  const [value, setValue] = useState("Cape Town");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(value);
  };

  return (
    <form className="city-search" onSubmit={handleSubmit}>
      <label htmlFor="city">City or town</label>
      <div className="city-search__row">
        <input
          id="city"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Cape Town"
        />
        <button type="submit" disabled={isLoading || !value.trim()}>
          {isLoading ? "Ranking..." : "Rank"}
        </button>
      </div>
    </form>
  );
}
