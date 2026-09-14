import { z } from "zod";

// PostgreSQL accepts the full 8-4-4-4-12 hexadecimal UUID representation.
// z.uuid() additionally requires RFC version/variant bits and rejects our
// deterministic seed identifiers, so database identifiers use z.guid().
export const databaseId = z.guid();
