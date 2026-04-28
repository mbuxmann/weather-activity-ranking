import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CitySearch } from "../../src/components/CitySearch";

// ---------------------------------------------------------------------------
// Integration tests — CitySearch component
//
// These verify the INTEGRATION between:
//   React Hook Form  ↔  Zod schema validation  ↔  the redesigned pill UI
//
// We test the component as a user would interact with it (input, submit,
// error messages), querying by accessible label/role rather than visual
// chrome so the tests survive future style refinements.
// ---------------------------------------------------------------------------

describe("CitySearch", () => {
  const setup = (props: Partial<Parameters<typeof CitySearch>[0]> = {}) => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    const utils = render(
      <CitySearch isLoading={false} onSearch={onSearch} {...props} />
    );
    return { onSearch, user, ...utils };
  };

  const getInput = () => screen.getByLabelText(/search a city/i);
  const getSubmit = () =>
    screen.getByRole("button", { name: /find best activity days|searching/i });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe("rendering", () => {
    it("renders an accessibly-labeled input and submit button", () => {
      setup();

      expect(screen.getByText(/search a city/i)).toBeInTheDocument();
      expect(getInput()).toBeInTheDocument();
      expect(getSubmit()).toBeInTheDocument();
    });

    it("pre-fills the input with 'Cape Town' by default", () => {
      setup();

      expect(getInput()).toHaveValue("Cape Town");
    });

    it("respects a custom defaultCity prop", () => {
      setup({ defaultCity: "Lisbon" });

      expect(getInput()).toHaveValue("Lisbon");
    });

    it("shows loading state when isLoading is true", () => {
      setup({ isLoading: true });

      const button = screen.getByRole("button", { name: /searching/i });
      expect(button).toBeDisabled();
    });
  });

  // -------------------------------------------------------------------------
  // Positive — valid submissions
  // -------------------------------------------------------------------------
  describe("positive (valid submissions)", () => {
    it("calls onSearch with the trimmed city name on valid submit", async () => {
      const { onSearch, user } = setup();

      const input = getInput();
      await user.clear(input);
      await user.type(input, "London");
      await user.click(getSubmit());

      await waitFor(() => {
        expect(onSearch).toHaveBeenCalledWith("London");
      });
    });

    it("submits on Enter key press", async () => {
      const { onSearch, user } = setup();

      const input = getInput();
      await user.clear(input);
      await user.type(input, "Berlin{Enter}");

      await waitFor(() => {
        expect(onSearch).toHaveBeenCalledWith("Berlin");
      });
    });

    it("trims whitespace from the submitted value", async () => {
      const { onSearch, user } = setup();

      const input = getInput();
      await user.clear(input);
      await user.type(input, "  Tokyo  ");
      await user.click(getSubmit());

      await waitFor(() => {
        expect(onSearch).toHaveBeenCalledWith("Tokyo");
      });
    });

    it("accepts accented characters like São Paulo", async () => {
      const { onSearch, user } = setup();

      const input = getInput();
      await user.clear(input);
      await user.type(input, "São Paulo");
      await user.click(getSubmit());

      await waitFor(() => {
        expect(onSearch).toHaveBeenCalledWith("São Paulo");
      });
    });
  });

  // -------------------------------------------------------------------------
  // Negative — invalid submissions show validation errors
  // -------------------------------------------------------------------------
  describe("negative (validation errors)", () => {
    it("shows an error when submitting an empty field", async () => {
      const { onSearch, user } = setup();

      const input = getInput();
      await user.clear(input);
      await user.click(getSubmit());

      await waitFor(() => {
        expect(
          screen.getByText("Please enter a city or town name.")
        ).toBeInTheDocument();
      });
      expect(onSearch).not.toHaveBeenCalled();
    });

    it("shows an error for a single-character input", async () => {
      const { onSearch, user } = setup();

      const input = getInput();
      await user.clear(input);
      await user.type(input, "A");
      await user.click(getSubmit());

      await waitFor(() => {
        expect(
          screen.getByText("City name must be at least 2 characters.")
        ).toBeInTheDocument();
      });
      expect(onSearch).not.toHaveBeenCalled();
    });

    it("shows an error for numeric input", async () => {
      const { onSearch, user } = setup();

      const input = getInput();
      await user.clear(input);
      await user.type(input, "12345");
      await user.click(getSubmit());

      await waitFor(() => {
        expect(
          screen.getByText(
            "City name can only contain letters, spaces, hyphens, and apostrophes."
          )
        ).toBeInTheDocument();
      });
      expect(onSearch).not.toHaveBeenCalled();
    });

    it("does not submit while loading", async () => {
      const { onSearch } = setup({ isLoading: true });

      const button = screen.getByRole("button", { name: /searching/i });
      expect(button).toBeDisabled();
      expect(onSearch).not.toHaveBeenCalled();
    });

    it("flags the input with aria-invalid when validation fails", async () => {
      const { user } = setup();

      const input = getInput();
      await user.clear(input);
      await user.click(getSubmit());

      await waitFor(() => {
        expect(input).toHaveAttribute("aria-invalid", "true");
      });
    });
  });

  // -------------------------------------------------------------------------
  // Interaction — user journey
  // -------------------------------------------------------------------------
  describe("user interaction flow", () => {
    it("clears the validation error after correcting the input", async () => {
      const { user } = setup();

      const input = getInput();
      await user.clear(input);
      await user.click(getSubmit());

      await waitFor(() => {
        expect(
          screen.getByText("Please enter a city or town name.")
        ).toBeInTheDocument();
      });

      // Correct the input
      await user.type(input, "Paris");
      await user.click(getSubmit());

      await waitFor(() => {
        expect(
          screen.queryByText("Please enter a city or town name.")
        ).not.toBeInTheDocument();
      });
    });
  });
});
