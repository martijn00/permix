import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import next from "ultracite/oxlint/next";
import react from "ultracite/oxlint/react";
import solid from "ultracite/oxlint/solid";
import svelte from "ultracite/oxlint/svelte";
import tanstack from "ultracite/oxlint/tanstack";
import vitest from "ultracite/oxlint/vitest";
import vue from "ultracite/oxlint/vue";

import { ignorePatterns } from "./ignores.ts";

// The React preset also enables react-hooks and jsx-a11y rules, which fire on
// Vue/Solid/Svelte sources because their `use*`/JSX-like code looks like React.
const nonReactGlobs = [
  "permix/src/vue/**",
  "permix/src/solid/**",
  "permix/src/svelte/**",
  "examples/vue/**",
  "examples/solid/**",
  "examples/svelte/**",
];

// Overrides coming from `extends` are applied after the ones declared here, so
// the Vitest preset is composed manually to keep these relaxations in effect.
const vitestOverrides = (vitest.overrides ?? []).map((override) => ({
  ...override,
  rules: {
    ...override.rules,
    "vitest/expect-expect": "off",
    "vitest/max-expects": "off",
    "vitest/prefer-called-exactly-once-with": "off",
    "vitest/prefer-to-be": "off",
    "vitest/require-mock-type-parameters": "off",
    "vitest/require-to-throw-message": "off",
    // The suite asserts on booleans, so keep the strict `toBe(true/false)`.
    "vitest/prefer-to-be-falsy": "off",
    "vitest/prefer-to-be-truthy": "off",
    // `vi.mock("mod")` with `vi.importActual<typeof import("mod")>()` types
    // correctly, while `vi.mock(import("mod"))` does not.
    "vitest/prefer-import-in-mock": "off",
    "typescript/consistent-type-imports": "off",
  },
}));

export default defineConfig({
  extends: [core, react, next, tanstack, vue, solid, svelte],
  ignorePatterns,
  options: {
    typeAware: true,
  },
  settings: {
    next: {
      rootDir: ["examples/next"],
    },
  },
  // Project-level relaxations on top of the Ultracite presets.
  rules: {
    // Stylistic preferences that conflict with the existing codebase.
    "func-style": "off",
    "guard-for-in": "off",
    "max-classes-per-file": "off",
    "no-else-return": "off",
    "no-nested-ternary": "off",
    "no-plusplus": "off",
    "no-promise-executor-return": "off",
    "no-shadow": "off",
    "no-use-before-define": "off",
    "no-void": "off",
    "prefer-destructuring": "off",
    "prefer-named-capture-group": "off",
    "require-await": "off",
    "require-unicode-regexp": "off",
    "sort-keys": "off",
    "import/namespace": "off",
    "jsdoc/check-tag-names": "off",
    "node/callback-return": "off",
    "oxc/no-barrel-file": "off",
    "promise/avoid-new": "off",
    "promise/prefer-await-to-callbacks": "off",
    "promise/prefer-await-to-then": "off",
    "unicorn/consistent-function-scoping": "off",
    "unicorn/filename-case": "off",
    "unicorn/no-array-method-this-argument": "off",
    "unicorn/no-array-reduce": "off",
    // Autofixes to `() => {}` / dropped arguments change behaviour and tests.
    "unicorn/no-useless-undefined": "off",
    // oxfmt drops the parentheses this rule asks for, so the two conflict.
    "unicorn/no-nested-ternary": "off",
    "unicorn/no-object-as-default-parameter": "off",
    "unicorn/prefer-response-static-json": "off",
    "unicorn/prefer-ternary": "off",
    // Generic-heavy public API relies on assertions and `any` in places.
    "typescript/ban-types": "off",
    "typescript/consistent-indexed-object-style": "off",
    "typescript/no-deprecated": "off",
    "typescript/no-empty-interface": "off",
    "typescript/no-empty-object-type": "off",
    "typescript/no-explicit-any": "off",
    "typescript/no-floating-promises": "off",
    "typescript/no-inferrable-types": "off",
    "typescript/no-invalid-void-type": "off",
    "typescript/no-misused-promises": "off",
    "typescript/no-non-null-assertion": "off",
    "typescript/no-redundant-type-constituents": "off",
    "typescript/no-unnecessary-type-conversion": "off",
    "typescript/no-unnecessary-type-parameters": "off",
    "typescript/no-unsafe-argument": "off",
    "typescript/no-unsafe-assignment": "off",
    "typescript/no-unsafe-call": "off",
    "typescript/no-unsafe-member-access": "off",
    "typescript/no-unsafe-return": "off",
    "typescript/no-unsafe-type-assertion": "off",
    "typescript/only-throw-error": "off",
    "typescript/prefer-nullish-coalescing": "off",
    "typescript/promise-function-async": "off",
    "typescript/consistent-return": "off",
    "typescript/return-await": "off",
    "typescript/strict-boolean-expressions": "off",
    "typescript/strict-void-return": "off",
    "typescript/unbound-method": "off",
    // Example and docs apps favour readability over the strictest React rules.
    "react/exhaustive-effect-dependencies": "off",
    "react/function-component-definition": "off",
    "react/jsx-no-useless-fragment": "off",
    "react/jsx-pascal-case": "off",
    "react/no-danger": "off",
    "react/no-unescaped-entities": "off",
    "react/todo": "off",
    "nextjs/no-head-element": "off",
  },
  overrides: [
    ...vitestOverrides,
    {
      files: nonReactGlobs,
      rules: {
        "react-hooks/rules-of-hooks": "off",
        "react/jsx-key": "off",
      },
    },
  ],
});
