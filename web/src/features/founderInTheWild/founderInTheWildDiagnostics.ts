import "server-only";

type SupabaseErrorLike = {
  code?: unknown;
};

export function logFounderInTheWildServerError(operation: string, error?: SupabaseErrorLike | null) {
  console.error("founder_in_the_wild_server_operation_failed", {
    operation,
    code: typeof error?.code === "string" ? error.code : "unknown",
  });
}
