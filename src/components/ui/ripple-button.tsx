"use client";

import { cn } from "@/lib/utils";
import React, { MouseEvent, useEffect, useState } from "react";

interface Ripple {
  x: number;
  y: number;
  size: number;
  key: number;
}

interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  rippleColor?: string;
  duration?: number;
  hoverBg?: string;
}

const RippleButton = React.forwardRef<HTMLButtonElement, RippleButtonProps>(
  (
    {
      className,
      children,
      rippleColor = "rgba(255,255,255,0.6)",
      duration = 600,
      hoverBg = "rgba(255,255,255,0.12)",
      onClick,
      ...props
    },
    ref
  ) => {
    const [ripples, setRipples] = useState<Ripple[]>([]);

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
      console.log("[RippleButton] handleClick fired", event.clientX, event.clientY);
      const button = event.currentTarget;
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const key = Date.now();
      console.log("[RippleButton] adding ripple to state", { x, y, size, key });
      setRipples((prev) => {
        const next = [...prev, { x, y, size, key }];
        console.log("[RippleButton] ripples state updated, count:", next.length);
        return next;
      });
      onClick?.(event);
    };

    useEffect(() => {
      if (ripples.length === 0) return;
      const latest = ripples[ripples.length - 1];
      const timer = setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.key !== latest.key));
      }, duration);
      return () => clearTimeout(timer);
    }, [ripples, duration]);

    return (
      <>
        <style>{`
          @keyframes ripple-expand {
            0%   { transform: translate(-50%, -50%) scale(0); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(4); opacity: 0; }
          }
          .ripple-btn::before {
            content: '';
            position: absolute;
            inset: 0;
            background-color: transparent;
            border-radius: inherit;
            z-index: 0;
            pointer-events: none;
            transition: background-color 300ms;
          }
          .ripple-btn:hover::before {
            background-color: var(--ripple-hover-bg, rgba(255,255,255,0.12));
          }
        `}</style>
        <button
          ref={ref}
          className={cn(
            "ripple-btn relative flex cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 px-4 py-2 text-center",
            className
          )}
          style={{ '--ripple-hover-bg': hoverBg } as React.CSSProperties}
          onClick={handleClick}
          {...props}
        >
          <span className="pointer-events-none absolute inset-0" style={{ zIndex: 1 }}>
            {ripples.map((ripple) => (
              <span
                key={ripple.key}
                style={{
                  position: "absolute",
                  borderRadius: "50%",
                  width: `${ripple.size}px`,
                  height: `${ripple.size}px`,
                  top: ripple.y,
                  left: ripple.x,
                  backgroundColor: rippleColor,
                  animation: `ripple-expand ${duration}ms linear forwards`,
                }}
              />
            ))}
          </span>
          <span className="relative z-10">{children}</span>
        </button>
      </>
    );
  }
);

RippleButton.displayName = "RippleButton";
export { RippleButton };
