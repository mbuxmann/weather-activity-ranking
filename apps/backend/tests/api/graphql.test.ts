import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";

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
});
