"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A lightweight canvas signature pad. Writes the captured signature as a base64
 * PNG data URL into a hidden input with the given `name` so it posts with the
 * surrounding form.
 */
export function SignaturePad({ name }: { name: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [value, setValue] = useState("");
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";

    function pos(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    function down(e: PointerEvent) {
      drawing.current = true;
      const p = pos(e);
      ctx!.beginPath();
      ctx!.moveTo(p.x, p.y);
      canvas!.setPointerCapture(e.pointerId);
    }
    function move(e: PointerEvent) {
      if (!drawing.current) return;
      const p = pos(e);
      ctx!.lineTo(p.x, p.y);
      ctx!.stroke();
    }
    function up() {
      if (!drawing.current) return;
      drawing.current = false;
      setValue(canvas!.toDataURL("image/png"));
    }

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointerleave", up);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointerleave", up);
    };
  }, []);

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setValue("");
  }

  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <canvas
        ref={canvasRef}
        width={500}
        height={160}
        className="w-full touch-none rounded-md border border-dashed border-gray-300 bg-white"
      />
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs text-gray-400">Sign above</span>
        <button type="button" onClick={clear} className="text-xs font-medium text-brand-600 hover:underline">
          Clear
        </button>
      </div>
    </div>
  );
}
