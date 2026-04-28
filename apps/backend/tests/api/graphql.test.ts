import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { locationNotFoundError } from "../../src/lib/errors.js";

describe("GraphQL API", () => {
  it("responds to activityRankings queries", async () => {
    const app = createApp({
      rankingService: {
        async getActivityRankings(city) {
          expect(city).toBe("Lisbon");
          return {
            location: {
              name: "Lisbon",
              country: "Portugal",
              latitude: 38.72,
              longitude: -9.14
            },
            days: [
              {
                date: "2026-04-28",
                rankings: [
                  {
                    activity: "OUTDOOR_SIGHTSEEING",
                    score: 90,
                    reason: "Comfortable and dry."
                  }
                ]
              }
            ]
          };
        }
      }
    });

    const response = await app.request("/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        query: `
          query ActivityRankings($city: String!) {
            activityRankings(city: $city) {
              location { name country }
              days {
                date
                rankings { activity score reason }
              }
            }
          }
        `,
        variables: {
          city: "Lisbon"
        }
      })
    });

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.errors).toBeUndefined();
    expect(payload.data.activityRankings.location.name).toBe("Lisbon");
  });

  it("returns safe application error codes for expected failures", async () => {
    const app = createApp({
      rankingService: {
        async getActivityRankings() {
          throw locationNotFoundError("Atlantis");
        }
      }
    });

    const response = await app.request("/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        query: `
          query ActivityRankings($city: String!) {
            activityRankings(city: $city) {
              location { name country }
            }
          }
        `,
        variables: {
          city: "Atlantis"
        }
      })
    });

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.errors[0]).toMatchObject({
      message: 'No location found for "Atlantis"',
      extensions: {
        code: "LOCATION_NOT_FOUND"
      }
    });
  });

  it("masks unexpected resolver errors", async () => {
    const app = createApp({
      rankingService: {
        async getActivityRankings() {
          throw new Error("database password leaked in stack");
        }
      }
    });

    const response = await app.request("/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        query: `
          query ActivityRankings($city: String!) {
            activityRankings(city: $city) {
              location { name country }
            }
          }
        `,
        variables: {
          city: "Lisbon"
        }
      })
    });

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.errors[0]).toMatchObject({
      message: "Something went wrong while ranking activities.",
      extensions: {
        code: "INTERNAL_ERROR"
      }
    });
    expect(JSON.stringify(payload)).not.toContain("database password");
  });
});
