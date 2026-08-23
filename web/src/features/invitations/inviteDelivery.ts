export type InvitePersistenceResult<T> =
  | { ok: true; value: T }
  | { ok: false };

export type InviteMailResult =
  | { ok: true }
  | { ok: false; error?: string };

export async function persistInviteBeforeMail<T>(params: {
  persist: () => Promise<InvitePersistenceResult<T>>;
  send: (value: T) => Promise<InviteMailResult>;
}) {
  let persistence: InvitePersistenceResult<T>;
  try {
    persistence = await params.persist();
  } catch {
    return { ok: false as const, stage: "persistence" as const };
  }
  if (!persistence.ok) {
    return { ok: false as const, stage: "persistence" as const };
  }

  let delivery: InviteMailResult;
  try {
    delivery = await params.send(persistence.value);
  } catch {
    delivery = { ok: false };
  }
  if (!delivery.ok) {
    return {
      ok: false as const,
      stage: "delivery" as const,
      value: persistence.value,
    };
  }

  return { ok: true as const, value: persistence.value };
}
