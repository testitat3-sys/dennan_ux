import { describe, it, expect } from "vitest";

describe("Product Description Paragraph Processing", () => {
  it("preserves paragraphs when saving and splitting product descriptions", () => {
    const rawDescriptionFromAdmin = `Paragraph 1: Soft 100% GOTS organic cotton set for newborns.

Paragraph 2: Features nickel-free poppers and expandable shoulders for easy dressing.

Paragraph 3: Machine washable at 40 degrees.`;

    // 1. Admin save simulation (.trim() only removes leading/trailing spaces)
    const savedInDatabase = rawDescriptionFromAdmin.trim();
    expect(savedInDatabase).toContain("\n\n");
    expect(savedInDatabase).toBe(rawDescriptionFromAdmin);

    // 2. PDP processing simulation (splitting by double newlines)
    const paragraphs = savedInDatabase.split(/\r?\n\s*\r?\n/);
    expect(paragraphs.length).toBe(3);
    expect(paragraphs[0]).toBe("Paragraph 1: Soft 100% GOTS organic cotton set for newborns.");
    expect(paragraphs[1]).toBe("Paragraph 2: Features nickel-free poppers and expandable shoulders for easy dressing.");
    expect(paragraphs[2]).toBe("Paragraph 3: Machine washable at 40 degrees.");
  });
});
