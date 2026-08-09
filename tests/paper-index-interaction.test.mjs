import assert from "node:assert/strict";
import test from "node:test";
import react from "@vitejs/plugin-react";
import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { createServer } from "vite";
import { DEFAULT_PAPER_BIBLIOGRAPHY_FILTERS } from "../lib/research/paper-bibliography.ts";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const originalSelf = globalThis.self;
globalThis.self = globalThis;

const entries = [
  {
    title: "Robotics Alpha",
    slug: "robotics-alpha",
    type: "papers",
    date: "2026-03-01",
    summary: "Manipulation policy with contact feedback.",
    authors: ["Ada"],
    venue: "ICRA",
    year: 2025,
    topics: ["robotics"],
    readingMethods: ["deep"],
    readingStatus: "completed",
    tags: [],
    related: [],
    status: "published",
    body: "",
  },
  {
    title: "Vision Beta",
    slug: "vision-beta",
    type: "papers",
    date: "2026-02-15",
    summary: "Tactile representation learning.",
    authors: ["Bob"],
    venue: "NeurIPS",
    year: 2024,
    topics: ["vision"],
    readingMethods: ["synthesis"],
    readingStatus: "synthesizing",
    tags: [],
    related: [],
    status: "published",
    body: "",
  },
];

test("paper index clears all seven controlled filters and restores the complete result set", async () => {
  const vite = await createServer({
    appType: "custom",
    configFile: false,
    logLevel: "silent",
    plugins: [react()],
    root: new URL("../", import.meta.url).pathname,
    server: { middlewareMode: true },
  });
  let renderer;

  try {
    const { PaperIndex } = await vite.ssrLoadModule("/components/paper-index.tsx");
    await act(async () => {
      renderer = TestRenderer.create(React.createElement(PaperIndex, { entries }));
    });

    const root = renderer.root;
    const input = root.findByType("input");
    const selects = root.findAllByType("select");
    assert.equal(selects.length, 6);

    await act(async () => {
      input.props.onChange({ target: { value: "Robotics" } });
      selects[0].props.onChange({ target: { value: "deep" } });
      selects[1].props.onChange({ target: { value: "completed" } });
      selects[2].props.onChange({ target: { value: "robotics" } });
      selects[3].props.onChange({ target: { value: "2025" } });
      selects[4].props.onChange({ target: { value: "ICRA" } });
      selects[5].props.onChange({ target: { value: "oldest" } });
    });

    assert.equal(root.findByType("input").props.value, "Robotics");
    assert.deepEqual(root.findAllByType("select").map((control) => control.props.value), [
      "deep", "completed", "robotics", "2025", "ICRA", "oldest",
    ]);
    assert.equal(root.findByProps({ className: "paper-bibliography" }).children.length, 1);
    const clearButton = root.findAllByType("button").find((button) => button.children.join("") === "清除筛选");
    assert.ok(clearButton);

    await act(async () => {
      clearButton.props.onClick();
    });

    assert.equal(root.findByType("input").props.value, DEFAULT_PAPER_BIBLIOGRAPHY_FILTERS.query);
    assert.deepEqual(root.findAllByType("select").map((control) => control.props.value), [
      DEFAULT_PAPER_BIBLIOGRAPHY_FILTERS.readingMethod,
      DEFAULT_PAPER_BIBLIOGRAPHY_FILTERS.readingStatus,
      DEFAULT_PAPER_BIBLIOGRAPHY_FILTERS.topic,
      DEFAULT_PAPER_BIBLIOGRAPHY_FILTERS.year,
      DEFAULT_PAPER_BIBLIOGRAPHY_FILTERS.venue,
      DEFAULT_PAPER_BIBLIOGRAPHY_FILTERS.order,
    ]);
    assert.equal(root.findAllByType("button").some((button) => button.children.join("") === "清除筛选"), false);
    assert.equal(root.findByProps({ className: "paper-bibliography" }).children.length, entries.length);
  } finally {
    if (renderer) {
      await act(async () => renderer.unmount());
    }
    await vite.close();
    if (originalSelf === undefined) {
      delete globalThis.self;
    } else {
      globalThis.self = originalSelf;
    }
  }
});
