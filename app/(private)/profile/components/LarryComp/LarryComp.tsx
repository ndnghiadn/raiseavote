// src/App.tsx
import React, { useRef, useState, useEffect } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const GRID = 8;

function snap(v: number): number {
  return Math.round(v / GRID) * GRID;
}

function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

interface ElementStyle {
  fontSize?: number;
  color?: string;
  background?: string;
}

type ElementType = "text" | "image" | "rectangle" | "button";

interface ElementData {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  src?: string;
  style?: ElementStyle;
}

interface Guide {
  v?: number;
  h?: number;
}

const defaultStyles = `
:root{--bg:#0f172a;--panel:#0b1220;--muted:#9aa4b2;--accent:#7c3aed}
*{box-sizing:border-box}
html,body,#root{height:100%}
body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial;background:var(--bg);color:#e6eef6}
`;

export default function LarryComp() {
  const [elements, setElements] = useState<ElementData[]>(() => [
    {
      id: uid("el"),
      type: "text",
      x: 40,
      y: 40,
      w: 220,
      h: 40,
      text: "Landing headline",
      style: { fontSize: 24, color: "#0b1220", background: "transparent" },
    },
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{
    mx: number;
    my: number;
    id: string;
    rect: DOMRect;
  } | null>(null);
  const [hoverGuide, setHoverGuide] = useState<Guide | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // Add element
  function addElement(type: ElementType) {
    const el: ElementData = {
      id: uid("el"),
      type,
      x: 60,
      y: 60,
      w: type === "text" ? 200 : 120,
      h: type === "text" ? 48 : 80,
      text: type === "text" ? "Edit me" : "",
      src:
        type === "image"
          ? "https://picsum.photos/300/200?random=" +
          Math.floor(Math.random() * 1000)
          : "",
      style: {
        fontSize: 16,
        color: "#0b1220",
        background: type === "button" ? "#7c3aed" : "transparent",
      },
    };

    setElements((prev) => [...prev, el]);
    setSelectedId(el.id);
  }

  // Pointer handlers for drag
  function onPointerDown(e: React.PointerEvent, id: string) {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const start = { mx: e.clientX, my: e.clientY, id, rect };
    setDragStart(start);
    setIsDragging(true);
    e.stopPropagation();
  }

  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      if (!isDragging || !dragStart) return;
      setElements((prev) =>
        prev.map((el) => {
          if (el.id !== dragStart.id) return el;
          const dx = e.clientX - dragStart.mx;
          const dy = e.clientY - dragStart.my;
          const newX = snap(el.x + dx);
          const newY = snap(el.y + dy);

          // alignment guides: center to canvas
          const canvasRect = dragStart.rect;
          const cx = canvasRect.width / 2;
          const cy = canvasRect.height / 2;
          const elCenterX = newX + el.w / 2;
          const elCenterY = newY + el.h / 2;

          const guide: Guide = {};
          if (Math.abs(elCenterX - cx) < 8) guide.v = cx;
          if (Math.abs(elCenterY - cy) < 8) guide.h = cy;
          setHoverGuide(guide);

          return { ...el, x: newX, y: newY };
        })
      );
      setDragStart((s) =>
        s ? { ...s, mx: e.clientX, my: e.clientY } : null
      );
    }
    function onPointerUp() {
      setIsDragging(false);
      setDragStart(null);
      setHoverGuide(null);
    }
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [isDragging, dragStart]);

  // Resize mapping
  function onResize(id: string, dx: number, dy: number, anchor: string) {
    setElements((prev) =>
      prev.map((el) => {
        if (el.id !== id) return el;
        let { x, y, w, h } = el;
        if (anchor === "br") {
          w = Math.max(16, snap(w + dx));
          h = Math.max(16, snap(h + dy));
        } else if (anchor === "mr") {
          w = Math.max(16, snap(w + dx));
        } else if (anchor === "mb") {
          h = Math.max(16, snap(h + dy));
        } else if (anchor === "tl") {
          x = snap(x + dx);
          y = snap(y + dy);
          w = Math.max(16, snap(w - dx));
          h = Math.max(16, snap(h - dy));
        }
        return { ...el, x, y, w, h };
      })
    );
  }

  // Inline edit handler
  function updateText(id: string, newText: string) {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, text: newText } : el))
    );
  }

  function changeStyle(id: string, patch: Partial<ElementStyle>) {
    setElements((prev) =>
      prev.map((el) =>
        el.id === id ? { ...el, style: { ...el.style, ...patch } } : el
      )
    );
  }

  function removeElement(id: string) {
    setElements((prev) => prev.filter((el) => el.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function bringForward(id: string) {
    setElements((prev) => {
      const idx = prev.findIndex((e) => e.id === id);
      if (idx === -1) return prev;
      const copy = [...prev];
      const [e] = copy.splice(idx, 1);
      copy.splice(Math.min(copy.length, idx + 1), 0, e);
      return copy;
    });
  }
  function sendBackward(id: string) {
    setElements((prev) => {
      const idx = prev.findIndex((e) => e.id === id);
      if (idx <= 0) return prev;
      const copy = [...prev];
      const [e] = copy.splice(idx, 1);
      copy.splice(idx - 1, 0, e);
      return copy;
    });
  }

  // Export generator
  async function generateExport() {
    const bodyElems = elements
      .map((el) => {
        const style = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;`;
        if (el.type === "text") {
          return `<div class="el el-text" style="${style}">${escapeHtml(
            el.text || ""
          )}</div>`;
        } else if (el.type === "image") {
          return `<img class="el el-image" src="${el.src
            }" style="${style}object-fit:cover;"/>`;
        } else if (el.type === "rectangle") {
          return `<div class="el el-rect" style="${style}"></div>`;
        } else if (el.type === "button") {
          return `<button class="el el-btn" style="${style}">${escapeHtml(
            el.text || "Button"
          )}</button>`;
        }
        return "";
      })
      .join("\n");

    const css = `body{margin:0;font-family:Inter,system-ui,Arial;}
.canvas{position:relative;width:1200px;height:800px;margin:24px auto;background:#fff;border:1px solid #ddd;box-shadow:0 6px 18px rgba(0,0,0,.08);}
.el{box-sizing:border-box;}
.el-text{font-size:16px;color:#0b1220;padding:6px}
.el-rect{background:#e6eef6}
.el-btn{background:#7c3aed;color:#fff;border:none;border-radius:6px}
.el-image{display:block}
`;

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="styles.css">
<title>Exported Design</title>
</head>
<body>
<div class="canvas">
${bodyElems}
</div>
<script src="script.js"></script>
</body>
</html>`;

    const js = `// Minimal script for exported page (empty for now)
console.log('Design loaded');`;

    const zip = new JSZip();
    zip.file("index.html", html);
    zip.file("styles.css", css);
    zip.file("script.js", js);
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "design-export.zip");
  }

  function escapeHtml(s: string): string {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function onCanvasPointerDown() {
    setSelectedId(null);
  }

  return (
    <div style={{ display: "flex", height: "100vh", gap: 12, padding: 12 }}>
      <style>{defaultStyles}</style>
      <aside style={{ width: 280, background: "#061025", padding: 12, borderRadius: 12 }}>
        <h3 style={{ margin: "6px 0" }}>Palette</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={() => addElement("text")}>Add Text</button>
          <button onClick={() => addElement("image")}>Add Image</button>
          <button onClick={() => addElement("rectangle")}>Add Rectangle</button>
          <button onClick={() => addElement("button")}>Add Button</button>
        </div>

        <hr style={{ margin: "12px 0" }} />
        <h4 style={{ margin: "6px 0" }}>Selected</h4>
        {selectedId ? (() => {
          const sel = elements.find((e) => e.id === selectedId);
          if (!sel) return <div>missing</div>;
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>ID: {sel.id}</div>
              <label>
                W:{" "}
                <input
                  type="number"
                  value={sel.w}
                  onChange={(e) =>
                    setElements((prev) =>
                      prev.map((x) =>
                        x.id === sel.id
                          ? { ...x, w: parseInt(e.target.value) || x.w }
                          : x
                      )
                    )
                  }
                />
              </label>
              <label>
                H:{" "}
                <input
                  type="number"
                  value={sel.h}
                  onChange={(e) =>
                    setElements((prev) =>
                      prev.map((x) =>
                        x.id === sel.id
                          ? { ...x, h: parseInt(e.target.value) || x.h }
                          : x
                      )
                    )
                  }
                />
              </label>
              {sel.type === "text" && (
                <label>
                  Font size:{" "}
                  <input
                    type="number"
                    value={sel.style?.fontSize || 16}
                    onChange={(e) =>
                      changeStyle(sel.id, {
                        fontSize: parseInt(e.target.value) || 16,
                      })
                    }
                  />
                </label>
              )}
              {sel.type === "image" && (
                <label>
                  Image URL:{" "}
                  <input
                    value={sel.src || ""}
                    onChange={(e) =>
                      setElements((prev) =>
                        prev.map((x) =>
                          x.id === sel.id ? { ...x, src: e.target.value } : x
                        )
                      )
                    }
                  />
                </label>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => bringForward(sel.id)}>Bring +</button>
                <button onClick={() => sendBackward(sel.id)}>Send -</button>
                <button onClick={() => removeElement(sel.id)}>Delete</button>
              </div>
            </div>
          );
        })() : <div style={{ color: "#6b7280" }}>No selection</div>}

        <hr style={{ margin: "12px 0" }} />
        <h4>Export</h4>
        <p style={{ color: "var(--muted)" }}>
          Export three files you can host anywhere.
        </p>
        <button onClick={generateExport}>Export HTML / CSS / JS</button>
      </aside>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Designer</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ padding: "6px 10px", background: "#071426", borderRadius: 8 }}>
              {elements.length} elements
            </div>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div
            ref={canvasRef}
            onPointerDown={onCanvasPointerDown}
            style={{
              width: 1200,
              height: 800,
              background: "#fff",
              position: "relative",
              borderRadius: 8,
              overflow: "hidden",
              boxShadow: "0 10px 30px rgba(0,0,0,.2)",
            }}
          >
            {hoverGuide?.v && (
              <div
                style={{
                  position: "absolute",
                  left: hoverGuide.v - 1,
                  top: 0,
                  width: 2,
                  height: "100%",
                  background: "rgba(124,58,237,0.9)",
                }}
              />
            )}
            {hoverGuide?.h && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: hoverGuide.h - 1,
                  width: "100%",
                  height: 2,
                  background: "rgba(124,58,237,0.9)",
                }}
              />
            )}

            {elements.map((el) => (
              <Element
                key={el.id}
                data={el}
                selected={selectedId === el.id}
                onPointerDown={(e) => {
                  setSelectedId(el.id);
                  onPointerDown(e, el.id);
                }}
                onDoubleClick={() => {
                  if (el.type === "text") {
                    const newText = prompt("Edit text", el.text);
                    if (newText !== null) updateText(el.id, newText);
                  }
                }}
                onResize={(dx, dy, anchor) => onResize(el.id, dx, dy, anchor)}
                onTextChange={(text) => updateText(el.id, text)}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

interface ElementProps {
  data: ElementData;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onDoubleClick: () => void;
  onResize: (dx: number, dy: number, anchor: string) => void;
  onTextChange: (text: string) => void;
}

function Element({
  data,
  selected,
  onPointerDown,
  onDoubleClick,
  onResize,
  onTextChange,
}: ElementProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.left = data.x + "px";
    el.style.top = data.y + "px";
    el.style.width = data.w + "px";
    el.style.height = data.h + "px";
  }, [data.x, data.y, data.w, data.h]);

  function startResize(e: React.PointerEvent, anchor: string) {
    e.stopPropagation();
    const start = { mx: e.clientX, my: e.clientY };
    function move(ev: PointerEvent) {
      const dx = ev.clientX - start.mx;
      const dy = ev.clientY - start.my;
      onResize(dx, dy, anchor);
      start.mx = ev.clientX;
      start.my = ev.clientY;
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: data.x,
    top: data.y,
    width: data.w,
    height: data.h,
    cursor: "move",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: selected
      ? "2px dashed rgba(124,58,237,0.9)"
      : "1px solid rgba(0,0,0,0.06)",
    background:
      data.type === "text"
        ? "transparent"
        : data.type === "rectangle"
          ? "#e6eef6"
          : "transparent",
    overflow: "hidden",
  };

  return (
    <div
      ref={ref}
      style={baseStyle}
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
    >
      {data.type === "text" && (
        <div
          contentEditable
          suppressContentEditableWarning
          style={{
            outline: "none",
            padding: 6,
            fontSize: (data.style?.fontSize || 16) + "px",
            color: data.style?.color || "#0b1220",
            width: "100%",
            height: "100%",
          }}
          onInput={(e) => onTextChange(e.currentTarget.textContent || "")}
        >
          {data.text}
        </div>
      )}
      {data.type === "image" && (
        <img
          src={data.src}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}
      {data.type === "rectangle" && <div style={{ width: "100%", height: "100%" }} />}
      {data.type === "button" && (
        <button
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "none",
            background: "#7c3aed",
            color: "#fff",
          }}
        >
          {data.text || "Button"}
        </button>
      )}

      {/* resize handles */}
      <div
        style={{
          position: "absolute",
          right: 2,
          bottom: 2,
          width: 10,
          height: 10,
          cursor: "se-resize",
          borderRadius: 2,
          background: "rgba(0,0,0,0.4)",
        }}
        onPointerDown={(e) => startResize(e, "br")}
      />
    </div>
  );
}
