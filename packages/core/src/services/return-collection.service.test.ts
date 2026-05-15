import { describe, expect, it, vi } from "vitest";
import type { ReturnRepository } from "../repositories/interfaces.js";
import { ReturnCollectionService } from "./return-collection.service.js";

describe("ReturnCollectionService", () => {
  it("creates return with valid reason code", async () => {
    const create = vi.fn().mockResolvedValue({ id: "ret-1" });
    const repo: ReturnRepository = { create, countByReason: vi.fn() };
    const service = new ReturnCollectionService(repo);

    const result = await service.capture("store-1", {
      reasonCode: "SIZE_TOO_SMALL",
      customerEmail: "buyer@example.com",
    });

    expect(result.id).toBe("ret-1");
    expect(create).toHaveBeenCalledWith(
      "store-1",
      expect.objectContaining({ reasonCode: "SIZE_TOO_SMALL" }),
    );
  });

  it("rejects invalid reason code", async () => {
    const repo: ReturnRepository = {
      create: vi.fn(),
      countByReason: vi.fn(),
    };
    const service = new ReturnCollectionService(repo);

    await expect(
      service.capture("store-1", {
        reasonCode: "INVALID" as "OTHER",
      }),
    ).rejects.toThrow();
  });
});
