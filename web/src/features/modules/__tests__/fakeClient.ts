import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ein Supabase-Stand-in fuer die Lader-Tests: Es antwortet, wie der Test es
 * vorgibt, und merkt sich jede Abfrage.
 *
 * Es kennt KEINE Constraints und keine RLS - es zeigt nur, welche Abfragen ein
 * Lader stellt und ob er damit etwas schreibt. Mehr soll es nicht.
 */
export type FakeQuery = {
  table: string;
  ops: string[];
  eqs: [string, unknown][];
  head: boolean;
};

export type FakeAnswer = { data?: unknown; count?: number | null; error?: unknown };

export function fakeClient(
  resolve: (query: FakeQuery) => FakeAnswer,
  rpc: (name: string, args: unknown) => FakeAnswer = () => ({ data: null })
) {
  const queries: FakeQuery[] = [];
  const rpcCalls: { name: string; args: unknown }[] = [];

  function builder(table: string) {
    const query: FakeQuery = { table, ops: [], eqs: [], head: false };
    const finish = () => {
      queries.push(query);
      const answer = resolve(query);
      return { data: answer.data ?? null, count: answer.count ?? null, error: answer.error ?? null };
    };
    const proxy: unknown = new Proxy(
      {},
      {
        get(_target, property) {
          if (property === "then") {
            return (onFulfilled: (value: unknown) => unknown, onRejected: (reason: unknown) => unknown) =>
              Promise.resolve(finish()).then(onFulfilled, onRejected);
          }
          if (property === "maybeSingle" || property === "single") return () => Promise.resolve(finish());
          return (...args: unknown[]) => {
            query.ops.push(String(property));
            if (property === "select" && (args[1] as { head?: boolean } | undefined)?.head) query.head = true;
            if (property === "eq") query.eqs.push([String(args[0]), args[1]]);
            return proxy;
          };
        },
      }
    );
    return proxy;
  }

  const client = {
    from: builder,
    rpc: (name: string, args: unknown) => {
      rpcCalls.push({ name, args });
      const answer = rpc(name, args);
      return Promise.resolve({ data: answer.data ?? null, error: answer.error ?? null });
    },
  };

  return Object.assign(client as unknown as SupabaseClient, { queries, rpcCalls });
}

export const eqOf = (query: FakeQuery, column: string) => query.eqs.find(([name]) => name === column)?.[1];
