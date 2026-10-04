import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as nodeModule from "node:module";
const registerHooks = (
  nodeModule as unknown as {
    registerHooks(hooks: {
      resolve(
        s: string,
        c: unknown,
        next: (
          s: string,
          c: unknown,
        ) => { url: string; shortCircuit?: boolean },
      ): { url: string; shortCircuit?: boolean };
      load(
        s: string,
        c: unknown,
        next: (
          s: string,
          c: unknown,
        ) => { format: string; source: string; shortCircuit?: boolean },
      ): { format: string; source: string; shortCircuit?: boolean };
    }): { deregister(): void };
  }
).registerHooks;
import ts from "typescript";
import {
  cloneElement,
  isValidElement,
  type ReactNode,
  type ReactElement,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createTranslator } from "next-intl";
import type { IntakeRound, IntakeReport } from "@/features/team-intake/model";
const dictionaries = Object.fromEntries(
  ["de", "en"].map((locale) => [
    locale,
    JSON.parse(readFileSync(`messages/${locale}/intake.json`, "utf8")),
  ]),
);
const fixture = { locale: "de" };
(
  globalThis as typeof globalThis & { __intakeReportTest?: unknown }
).__intakeReportTest = {
  translate: () =>
    createTranslator({
      locale: fixture.locale,
      messages: dictionaries[fixture.locale],
    }),
};
const mocks: Record<string, string> = {
  "next-intl/server":
    "export const getTranslations=async()=>globalThis.__intakeReportTest.translate();",
  "@/features/team-intake/actions":
    "export const saveIntakeAction=async()=>{};",
};
const hooks = registerHooks({
  resolve(s, c, next) {
    return mocks[s]
      ? {
          url: `data:text/javascript,${encodeURIComponent(mocks[s])}`,
          shortCircuit: true,
        }
      : next(s, c);
  },
  load(s, c, next) {
    return s.endsWith(".tsx") && s.includes("/team-intake/")
      ? {
          format: "module",
          shortCircuit: true,
          source: ts.transpileModule(readFileSync(fileURLToPath(s), "utf8"), {
            compilerOptions: {
              module: ts.ModuleKind.ESNext,
              jsx: ts.JsxEmit.ReactJSX,
              target: ts.ScriptTarget.ES2022,
            },
          }).outputText,
        }
      : next(s, c);
  },
});
const { SharedIntakeReport } = await import("@/features/team-intake/Report");
hooks.deregister();
async function resolveNode(node: ReactNode): Promise<ReactNode> {
  if (Array.isArray(node))
    return Promise.all(
      node.map(async (child, index) => {
        const resolved = await resolveNode(child);
        return isValidElement(resolved)
          ? cloneElement(resolved, { key: resolved.key ?? index })
          : resolved;
      }),
    );
  if (!isValidElement(node)) return node;
  const element = node as ReactElement<Record<string, unknown>>;
  if (typeof element.type === "function")
    return resolveNode(
      await (
        element.type as (
          p: Record<string, unknown>,
        ) => Promise<ReactNode> | ReactNode
      )(element.props),
    );
  return cloneElement(
    element,
    {},
    await resolveNode(element.props.children as ReactNode),
  );
}
for (const locale of ["de", "en"])
  for (const count of [2, 3, 4])
    for (const mode of ["selection", "development"] as const) {
      test(`${locale}: ${count} founders ${mode}, originals in every directed perspective without private data`, async () => {
        fixture.locale = locale;
        const ids = ["A", "B", "C"].slice(0, count);
        const round = {
          name: "Local team",
          mode,
          published_at: "2026-10-02",
          participants: ids.map((id) => ({ user_id: id, name: id })),
        } as IntakeRound;
        const report: IntakeReport = {
          common: ids.map((id) => ({
            author_user_id: id,
            data: {
              formation: "together",
              venture_since: "2025",
              existed: "partly",
              motivation: `MOTIVE_${id}`,
              works_well: `WORK_${id}`,
              private_note: "MUST_NOT_RENDER",
            },
          })),
          pairs: ids.flatMap((author) =>
            ids
              .filter((target) => target !== author)
              .map((target) => ({
                author_user_id: author,
                target_user_id: target,
                data: {
                  origin: "project",
                  since: "2024",
                  worked: false,
                  appreciation: `ORIGINAL_${author}_${target} <script>unsafe</script>`,
                },
              })),
          ),
        };
        const html = renderToStaticMarkup(
          await resolveNode(await SharedIntakeReport({ round, report })),
        );
        for (const author of ids)
          for (const target of ids.filter((id) => id !== author))
            assert.equal(
              html.split(`ORIGINAL_${author}_${target}`).length - 1,
              1,
            );
        assert.doesNotMatch(
          html,
          /MUST_NOT_RENDER|<script>|PRIVATE_|Match %|Erfolgsaussicht|Success probability/,
        );
        assert.match(html, /&lt;script&gt;/);
        assert.ok(html.includes(dictionaries[locale].missing));
        assert.ok(html.includes(dictionaries[locale].history));
        assert.ok(html.includes(dictionaries[locale].openSection));
        assert.equal(html.includes("MOTIVE_A"), mode === "selection");
        assert.equal(html.includes("WORK_A"), mode === "development");
      });
    }
